import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createHouseWorld, createGameController } from './house-world';
import { houseStops, sampleHouseTour } from './house-tour';

type Chapter = { element: HTMLElement; content: HTMLElement; target: string; arrival: number; departure: number };

export default class HouseJourney {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  viewport: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, 1, 0.05, 90);
  world = createHouseWorld();
  actor = new THREE.Group();
  controller = createGameController();
  character: THREE.Group | null = null;
  mixer: THREE.AnimationMixer | null = null;
  actions = new Map<string, THREE.AnimationAction>();
  action: THREE.AnimationAction | null = null;
  lookBones: { bone: THREE.Bone; base: THREE.Quaternion; weight: number }[] = [];
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  chapters: Chapter[] = [];
  observer: ResizeObserver;
  frame = 0;
  previousTime = 0;
  goalProgress = 0;
  progress = 0;
  travelDirection = 1;
  width = 1;
  height = 1;
  renderHeight = 1;
  pointer = new THREE.Vector2();
  headYaw = 0;
  headPitch = 0;
  paused = false;
  destroyed = false;
  ready = false;
  visible = true;

  constructor(root: HTMLElement) {
    this.root = root;
    const canvas = root.querySelector<HTMLCanvasElement>('.js-hero-canvas');
    const viewport = root.querySelector<HTMLElement>('.js-hero-viewport');
    if (!canvas || !viewport) throw new Error('3Dの表示領域がありません。');
    this.canvas = canvas;
    this.viewport = viewport;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene.background = new THREE.Color(0xeaf0ee);
    this.scene.fog = new THREE.Fog(0xeaf0ee, 22, 55);
    this.actor.add(this.controller);
    this.controller.position.set(0, 0.58, -0.14);
    this.scene.add(this.world.group, this.actor);
    this.scene.add(new THREE.HemisphereLight(0xf4f7ff, 0xb9aa8d, 2.6));
    const sunlight = new THREE.DirectionalLight(0xffefcf, 3.3);
    sunlight.position.set(-7, 12, 8);
    sunlight.target.position.set(0, 1.8, 0);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    Object.assign(sunlight.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 32 });
    sunlight.shadow.normalBias = 0.025;
    sunlight.shadow.bias = -0.0002;
    this.scene.add(sunlight, sunlight.target);
    // Soft room fill prevents the roof from turning interiors into silhouettes.
    const roomFill = new THREE.DirectionalLight(0xffffff, 1.3);
    roomFill.position.set(1, 5, 3);
    this.scene.add(roomFill);
    for (const element of root.querySelectorAll<HTMLElement>('.js-journey-section')) {
      const content = element.querySelector<HTMLElement>('.js-journey-content');
      if (content && element.dataset.journeyTarget)
        this.chapters.push({ element, content, target: element.dataset.journeyTarget, arrival: 0, departure: 0 });
    }
    this.observer = new ResizeObserver(this.handleViewportResize);
    this.initialize();
  }

  initialize() {
    this.observer.observe(this.viewport);
    for (const chapter of this.chapters) this.observer.observe(chapter.content);
    this.attachEvent();
    this.handleViewportResize();
    void this.loadCharacter();
  }

  attachEvent() {
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
    window.addEventListener('pointermove', this.handleWindowPointerMove, { passive: true });
    document.addEventListener('pointerleave', this.handleDocumentPointerLeave);
    document.addEventListener('visibilitychange', this.handleDocumentVisibilityChange);
    document.addEventListener('focusin', this.handleDocumentFocusIn);
    window.addEventListener('pagehide', this.handleWindowPageHide);
    window.addEventListener('pageshow', this.handleWindowPageShow);
    this.motionPreference.addEventListener('change', this.handleMotionPreferenceChange);
    this.canvas.addEventListener('webglcontextlost', this.handleCanvasContextLost);
    this.root.querySelector('.js-hero-motion')?.addEventListener('click', this.handleMotionButtonClick);
  }

  detachEvent() {
    window.removeEventListener('scroll', this.handleWindowScroll);
    window.removeEventListener('pointermove', this.handleWindowPointerMove);
    document.removeEventListener('pointerleave', this.handleDocumentPointerLeave);
    document.removeEventListener('visibilitychange', this.handleDocumentVisibilityChange);
    document.removeEventListener('focusin', this.handleDocumentFocusIn);
    window.removeEventListener('pagehide', this.handleWindowPageHide);
    window.removeEventListener('pageshow', this.handleWindowPageShow);
    this.motionPreference.removeEventListener('change', this.handleMotionPreferenceChange);
    this.canvas.removeEventListener('webglcontextlost', this.handleCanvasContextLost);
    this.root.querySelector('.js-hero-motion')?.removeEventListener('click', this.handleMotionButtonClick);
  }

  async loadCharacter() {
    try {
      const model = await new GLTFLoader().loadAsync('/assets/models/human-lowpoly-rigged.glb');
      if (this.destroyed) {
        this.disposeObject(model.scene);
        return;
      }
      this.character = model.scene;
      this.actor.add(model.scene);
      model.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          const originals = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of originals) material.dispose();
          object.material = new THREE.MeshStandardMaterial({ color: 0xb8b9b7, roughness: 0.78, flatShading: true });
        }
        if (object instanceof THREE.Bone && ['Head', 'Neck'].includes(object.name))
          this.lookBones.push({
            bone: object,
            base: object.quaternion.clone(),
            weight: object.name === 'Head' ? 0.65 : 0.35,
          });
      });
      this.mixer = new THREE.AnimationMixer(model.scene);
      for (const clip of model.animations) {
        const action = this.mixer.clipAction(clip);
        if (['StandUp', 'SitDown'].includes(clip.name)) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        this.actions.set(clip.name, action);
      }
      for (const name of ['Typing', 'Idle', 'Walk', 'StandUp', 'SitDown', 'SitIdle']) {
        if (!this.actions.has(name)) throw new Error('必要なアニメーションがありません: ' + name);
      }
      this.ready = true;
      const status = this.root.querySelector<HTMLElement>('.js-hero-status');
      if (status) status.textContent = '';
      this.root.classList.add('m-hero-scene--ready');
      this.handleMotionPreferenceChange();
      const hashTarget = this.chapters.find((chapter) => '#' + chapter.target === window.location.hash);
      if (hashTarget) hashTarget.content.scrollIntoView({ behavior: 'instant', block: 'start' });
      this.handleWindowScroll();
      this.progress = this.goalProgress;
      this.render(0);
      this.start();
    } catch (error) {
      console.warn('家の3D表示を初期化できませんでした。', error);
      this.destroy();
    }
  }

  handleMotionPreferenceChange = () => {
    this.root.classList.toggle('m-hero-scene--journey', !this.motionPreference.matches && this.ready);
    this.handleViewportResize();
    this.handleWindowScroll();
    if (this.motionPreference.matches) {
      this.progress = 0;
      this.stop();
      this.render(0);
    } else this.start();
  };

  handleViewportResize = () => {
    this.width = this.viewport.clientWidth;
    this.height = this.viewport.clientHeight;
    this.renderer.setSize(this.width, this.height, false);
    const narrow = this.width <= 768;
    for (const chapter of this.chapters) {
      chapter.arrival =
        chapter.content.getBoundingClientRect().top + window.scrollY - this.height * (narrow ? 0.42 : 0.15);
      chapter.departure = Math.max(
        chapter.arrival + this.height * 0.3,
        chapter.content.getBoundingClientRect().bottom + window.scrollY - this.height * 0.7,
      );
    }
    this.handleWindowScroll();
    if (this.ready) this.render(0);
  };

  handleWindowScroll = () => {
    if (!this.ready) return;
    const y = window.scrollY;
    let progress = 0;
    let departure = this.root.getBoundingClientRect().top + y + this.height * 0.15;
    for (let i = 0; i < this.chapters.length; i++) {
      const chapter = this.chapters[i];
      if (y < chapter.arrival) {
        progress = i + THREE.MathUtils.clamp((y - departure) / Math.max(1, chapter.arrival - departure), 0, 1);
        break;
      }
      progress = i + 1;
      departure = chapter.departure;
    }
    if (Math.abs(progress - this.goalProgress) > 0.0001) this.travelDirection = progress >= this.goalProgress ? 1 : -1;
    this.goalProgress = this.motionPreference.matches ? 0 : progress;
    this.visible =
      this.root.getBoundingClientRect().bottom > 100 && this.root.getBoundingClientRect().top < this.height;
    this.root.classList.toggle('m-hero-scene--offscreen', !this.visible);
    if (this.paused || this.motionPreference.matches) {
      this.progress = this.goalProgress;
      this.render(0);
    } else this.start();
  };

  handleWindowPointerMove = (event: PointerEvent) => {
    this.pointer.set((event.clientX / this.width) * 2 - 1, (event.clientY / this.height) * 2 - 1);
  };

  handleDocumentPointerLeave = () => {
    this.pointer.set(0, 0);
  };

  handleDocumentFocusIn = (event: FocusEvent) => {
    if (this.width > 768 || this.motionPreference.matches || !(event.target instanceof HTMLElement)) return;
    const panel = event.target.closest('.js-journey-content');
    if (!panel) return;
    const top = event.target.getBoundingClientRect().top;
    if (top < this.renderHeight + 20) window.scrollBy({ top: top - this.renderHeight - 24, behavior: 'instant' });
  };

  handleDocumentVisibilityChange = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  handleMotionButtonClick = () => {
    this.paused = !this.paused;
    const button = this.root.querySelector<HTMLButtonElement>('.js-hero-motion');
    if (button) {
      button.textContent = this.paused ? '動きを再開' : '動きを止める';
      button.setAttribute('aria-pressed', String(this.paused));
    }
    if (this.paused) this.stop();
    else this.start();
  };

  handleWindowPageShow = () => {
    this.start();
  };

  handleWindowPageHide = (event: PageTransitionEvent) => {
    if (event.persisted) this.stop();
    else this.destroy();
  };

  handleCanvasContextLost = (event: Event) => {
    event.preventDefault();
    this.destroy();
  };

  play(name: string) {
    const action = this.actions.get(name);
    if (!action || action === this.action) return;
    this.action?.stop();
    action.reset().play();
    this.action = action;
  }

  render(delta: number) {
    if (this.destroyed || !this.ready) return;
    const tour = sampleHouseTour(this.progress);
    this.actor.position.copy(tour.position);
    const yaw = tour.yaw + (tour.action === 'Walk' && this.travelDirection < 0 ? Math.PI : 0);
    const difference = Math.atan2(Math.sin(yaw - this.actor.rotation.y), Math.cos(yaw - this.actor.rotation.y));
    this.actor.rotation.y += delta > 0 ? difference * (1 - Math.exp(-delta * 9)) : difference;
    this.controller.visible = tour.action === 'SitIdle';
    this.play(tour.action);
    for (const { bone, base } of this.lookBones) bone.quaternion.copy(base);
    if (tour.actionProgress !== null && this.action)
      this.action.time = this.action.getClip().duration * Math.min(0.999, tour.actionProgress);
    const moving = Math.abs(this.goalProgress - this.progress) > 0.0001;
    this.mixer?.update(tour.actionProgress !== null || (tour.action === 'Walk' && !moving) ? 0 : delta);
    for (const item of this.lookBones) item.base.copy(item.bone.quaternion);
    // Gaze is limited to the neck and head. Eyes remain part of the supplied model.
    const gaze = tour.action === 'Typing' || tour.action === 'Idle' ? 1 : 0;
    this.headYaw = THREE.MathUtils.damp(this.headYaw, this.pointer.x * 0.2 * gaze, 5, delta);
    this.headPitch = THREE.MathUtils.damp(this.headPitch, this.pointer.y * 0.1 * gaze, 5, delta);
    for (const { bone, weight } of this.lookBones) {
      bone.quaternion.multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(this.headPitch * weight, this.headYaw * weight, 0)),
      );
    }
    this.world.door.rotation.y = -THREE.MathUtils.smoothstep(this.progress, 3.15, 3.88) * 1.35;
    this.camera.position.copy(tour.camera);
    this.camera.fov = tour.fov;
    this.camera.lookAt(tour.target);
    const firstArrival = this.chapters[0]?.arrival || this.height;
    const reading = this.motionPreference.matches
      ? 0
      : THREE.MathUtils.smoothstep(window.scrollY, firstArrival - this.height * 0.65, firstArrival);
    this.root.classList.toggle('m-hero-scene--reading', reading > 0.1);
    this.renderHeight = this.width <= 768 ? this.height * (1 - reading * 0.58) : this.height;
    this.root.style.setProperty('--footer-bottom', this.height - this.renderHeight + 16 + 'px');
    this.camera.aspect = this.width / this.renderHeight;
    this.camera.setViewOffset(
      this.width,
      this.renderHeight,
      -this.width * (this.width <= 768 ? 0.02 : 0.18),
      0,
      this.width,
      this.renderHeight,
    );
    this.camera.updateProjectionMatrix();
    this.renderer.setScissorTest(false);
    this.renderer.setClearColor(0xffffff);
    this.renderer.clear();
    this.renderer.setViewport(0, this.height - this.renderHeight, this.width, this.renderHeight);
    this.renderer.setScissor(0, this.height - this.renderHeight, this.width, this.renderHeight);
    this.renderer.setScissorTest(true);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setScissorTest(false);
    this.root.style.setProperty('--intro-opacity', String(1 - THREE.MathUtils.smoothstep(this.progress, 0.02, 0.4)));
    for (const chapter of this.chapters) {
      const clip =
        this.width <= 768 && !this.motionPreference.matches
          ? Math.max(0, this.renderHeight - chapter.content.getBoundingClientRect().top)
          : 0;
      chapter.content.style.setProperty('--journey-clip-top', clip + 'px');
    }
    const stopIndex = Math.min(4, Math.round(this.progress));
    const label = this.root.querySelector<HTMLElement>('.js-journey-label');
    if (label) label.textContent = houseStops[stopIndex].label;
    const count = this.root.querySelector<HTMLElement>('.js-journey-count');
    if (count) count.textContent = String(stopIndex + 1).padStart(2, '0');
    const next = this.root.querySelector<HTMLAnchorElement>('.js-journey-next');
    if (next) next.href = '#' + houseStops[stopIndex === 4 ? 0 : stopIndex + 1].id;
    const nextLabel = this.root.querySelector<HTMLElement>('.js-journey-next-label');
    if (nextLabel) nextLabel.textContent = stopIndex === 4 ? 'Back to top' : 'Scroll to explore';
    const nextIcon = this.root.querySelector<HTMLElement>('.js-journey-next-icon');
    if (nextIcon) nextIcon.textContent = stopIndex === 4 ? '↑' : '↓';
    if (this.root.dataset.houseStop !== houseStops[stopIndex].id) {
      for (const link of document.querySelectorAll<HTMLAnchorElement>('.js-house-nav-link')) {
        if (link.hash === '#' + houseStops[stopIndex].id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
    this.root.dataset.houseStop = houseStops[stopIndex].id;
  }

  start() {
    if (
      this.frame ||
      this.destroyed ||
      this.paused ||
      !this.ready ||
      !this.visible ||
      document.hidden ||
      this.motionPreference.matches
    )
      return;
    this.previousTime = 0;
    this.frame = requestAnimationFrame(this.animate);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.previousTime = 0;
  }

  animate = (time: number) => {
    this.frame = 0;
    const delta = this.previousTime ? Math.min((time - this.previousTime) / 1000, 0.05) : 0;
    this.previousTime = time;
    this.progress = THREE.MathUtils.damp(this.progress, this.goalProgress, 9, delta);
    if (Math.abs(this.goalProgress - this.progress) < 0.0001) this.progress = this.goalProgress;
    this.render(delta);
    if (this.visible && !this.paused && !document.hidden && !this.destroyed)
      this.frame = requestAnimationFrame(this.animate);
  };

  disposeObject(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(material);
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
        if (object instanceof THREE.InstancedMesh) object.dispose();
      }
      if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    const textures = new Set<THREE.Texture>();
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial && material.map) textures.add(material.map);
      material.dispose();
    }
    for (const texture of textures) texture.dispose();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    this.detachEvent();
    this.observer.disconnect();
    this.mixer?.stopAllAction();
    if (this.character) this.mixer?.uncacheRoot(this.character);
    this.disposeObject(this.scene);
    this.renderer.dispose();
    this.root.classList.remove(
      'm-hero-scene--journey',
      'm-hero-scene--ready',
      'm-hero-scene--offscreen',
      'm-hero-scene--reading',
    );
    this.root.classList.add('m-hero-scene--fallback');
    this.root.style.removeProperty('--intro-opacity');
    this.root.style.removeProperty('--footer-bottom');
    for (const chapter of this.chapters) chapter.content.style.removeProperty('--journey-clip-top');
    const status = this.root.querySelector<HTMLElement>('.js-hero-status');
    if (status) status.textContent = '3D表示を利用できないため、通常のページで表示しています。';
  }
}
