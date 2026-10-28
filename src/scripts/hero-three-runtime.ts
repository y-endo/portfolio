import * as THREE from 'three';
import { chapters } from '../data/chapters';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { createHouseHeadings } from './house-headings';
import { createHouseWorld, createGlass, PROP_MODELS } from './house-world';
import { createBirds } from './house-birds';
import { createDaylight } from './house-daylight';
import { leavePage } from './feature/page-veil';
import { houseStops, sampleHouseTour, sampleOpening, WORKS_SEATED_PROGRESS } from './house-tour';
import type { HouseStop } from './house-tour';
import {
  createCanvasTexture,
  createTelevisionPower,
  drawMonitorScreen,
  drawStandbyScreen,
  drawWorkScreen,
  drawYearSign,
} from './house-screens';

type Shot = {
  element: HTMLElement;
  content: HTMLElement;
  stop: HouseStop;
  index: number;
  arrival: number;
  departure: number;
  heading: HTMLElement | null;
  headingSpace: number;
};

const CHAPTERS = chapters.map((chapter) => chapter.id);
/** The first stop of each chapter, where its dot sits on the chapter rail. */
const CHAPTER_STOPS = CHAPTERS.map((chapter) => houseStops.findIndex((stop) => stop.chapter === chapter));

/**
 * How far down the chapter rail the journey is, from 0 at the first dot to 1 at the last. The dots are evenly
 * spaced, but chapters hold different numbers of stops, so progress is measured from dot to dot.
 */
function railProgress(progress: number) {
  const last = CHAPTER_STOPS.length - 1;
  for (let chapter = 0; chapter < last; chapter++) {
    const from = CHAPTER_STOPS[chapter];
    const to = CHAPTER_STOPS[chapter + 1];
    if (progress < to) return (chapter + THREE.MathUtils.clamp((progress - from) / (to - from), 0, 1)) / last;
  }
  return 1;
}
const REQUIRED_CLIPS = ['Typing', 'Idle', 'Walk', 'StandUp', 'SitDown', 'SitIdle'];
/** Clips added in Blender later. Older models fall back to the nearest original clip. */
const CLIP_FALLBACKS: Record<string, string> = {
  StairsDown: 'Walk',
  LeanRail: 'Idle',
  Drink: 'Idle',
  Wave: 'Idle',
};
const SCRUBBED_CLIPS = ['StandUp', 'SitDown', 'Drink'];
const GAZE_CLIPS = ['Typing', 'Idle', 'LeanRail'];
/** Grips measured in tools/blender/add-house-actions.py, in RightHand bone space. */
// The tumbler leans 20 degrees toward the fingers, as a real grip holds it, so the wrist stays straight at the sip.
// The hand holds it near the base, 0.045 m below the glass centre, clear of the rim at the lips.
const GLASS_OFFSET = new THREE.Vector3(-0.0724, 0.0874, 0.0361);
const GLASS_ROTATION = new THREE.Quaternion(0.5714, 0, 0.0498, 0.8192).normalize();
/** Where the props rest when not held, relative to the stop where they are used, and when the hand takes them. */
const GLASS_REST_POSITION = new THREE.Vector3(-0.19, 0.99, 0.41);
const DRINK_GRAB = 24 / 120;
/**
 * The mouth stays closed, and opens for the sip only: from Drink frame 36, wide by 44 as the glass reaches the
 * lips (46 to 58), and closed again by 67 (of 120).
 */
const DRINK_MOUTH = { opening: [36 / 120, 44 / 120], closing: [60 / 120, 67 / 120] } as const;
const DRINK_RELEASE = 105.6 / 120;
/** How far the desk chair rolls back while the person stands up. */
const CHAIR_PUSH = 0.6;
const OPENING_SECONDS = 7;
/**
 * The loader's count climbs from 0 to 100 in no less than this, so it reads as a count even from the cache.
 * Visitors arriving at a chapter, such as on the way back from a project page, have seen it already.
 */
const LOADER_COUNT_SECONDS = { first: 1.6, chapter: 0.5 };
/**
 * The downloads take the loader to 90%; the rest is preparing the drawing (`warmUp()`), so the loader lifts only
 * once every frame of the visit can be drawn without a stall.
 */
const DOWNLOAD_SHARE = 0.9;
/** Stops drawn once behind the loader, between them showing every room and kind of object in the house. */
const WARM_UP_STOPS = ['top', 'profile', 'career-1', 'works-1', 'kitchen', 'contact'];
/** How the journey follows the scroll: the spring's settling time, and its speed limit in stops per second. */
const FOLLOW_SECONDS = 0.35;
const FOLLOW_SPEED = { base: 1.4, perStopBehind: 1.2 };
/** A link this many stops away or more cuts to its chapter behind a white veil; the times are its fade in and out. */
const VEIL = { minStops: 2, inSeconds: 0.35, outSeconds: 0.6 };

/**
 * A critically damped spring towards `target` (the smooth damp of game engines), limited to `maxSpeed` per second.
 * Unlike an exponential ease it starts gently, so a sudden jump of the target never starts with a lurch.
 */
function smoothDamp(current: number, target: number, velocity: number, maxSpeed: number, delta: number) {
  if (delta <= 0) return { value: current, velocity };
  const omega = 2 / FOLLOW_SECONDS;
  const x = omega * delta;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * FOLLOW_SECONDS;
  const change = THREE.MathUtils.clamp(current - target, -maxChange, maxChange);
  const step = (velocity + omega * change) * delta;
  let value = current - change + (change + step) * decay;
  let nextVelocity = (velocity - omega * step) * decay;
  // Never overshoot the target.
  if (target - current > 0 === value > target) {
    value = target;
    nextVelocity = 0;
  }
  return { value, velocity: nextVelocity };
}

export default class HouseJourney {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  viewport: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, 1, 0.05, 90);
  world = createHouseWorld();
  television = createTelevisionPower(this.world.tvScreen.material);
  actor = new THREE.Group();
  glass = createGlass();
  birds = createBirds();
  daylight: ReturnType<typeof createDaylight>;
  glassRest = new THREE.Group();
  composer: EffectComposer | null = null;
  environment: THREE.WebGLRenderTarget | null = null;
  character: THREE.Group | null = null;
  headings: ReturnType<typeof createHouseHeadings> | null = null;
  rightHand: THREE.Bone | null = null;
  /** The figure's meshes with the "MouthClosed" shape, and where it sits in their morph targets. */
  mouths: { mesh: THREE.Mesh; index: number }[] = [];
  mixer: THREE.AnimationMixer | null = null;
  actions = new Map<string, THREE.AnimationAction>();
  action: THREE.AnimationAction | null = null;
  lookBones: { bone: THREE.Bone; base: THREE.Quaternion; weight: number }[] = [];
  textures: THREE.Texture[] = [];
  tvTextures: { standby: THREE.Texture | null; works: THREE.Texture[] } = { standby: null, works: [] };
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  shots: Shot[] = [];
  observer: ResizeObserver;
  frame = 0;
  previousTime = 0;
  goalProgress = 0;
  progress = 0;
  progressVelocity = 0;
  travelDirection = 1;
  width = 1;
  height = 1;
  pointer = new THREE.Vector2();
  parallax = new THREE.Vector2();
  /**
   * Dragging the scene with a mouse swings the camera round the point at the centre of the screen (the shot's
   * target); `goal` follows the pointer and the swing eases after it, then back to the shot on release.
   */
  drag = {
    isActive: false,
    start: new THREE.Vector2(),
    swing: new THREE.Vector2(),
    goal: new THREE.Vector2(),
    /** How far the pointer has moved since it was pressed, so a drag that ends on the television is not a click. */
    travel: 0,
  };
  raycaster = new THREE.Raycaster();
  /**
   * Following a link far along the journey would race through every room on the way, so the view fades to white,
   * the page jumps to the chapter, the journey takes its stop at once, and the veil lifts again.
   */
  veil = { amount: 0, goal: 0, target: null as HTMLElement | null, settlingFrames: 0 };
  /** Where the camera looks, trailing the sampled target slightly. */
  followTarget = new THREE.Vector3();
  headYaw = 0;
  headPitch = 0;
  isDestroyed = false;
  isReady = false;
  isVisible = true;
  /** 0 is the garden shot, 1 the hero shot of the study. */
  opening = 0;
  introductionElapsed = 0;
  elapsed = 0;
  /**
   * The share of the house loaded, and the share the loader's count shows, trailing it at a readable pace.
   * `files` holds how far each model file has downloaded, from 0 to 1.
   */
  loader = { loaded: 0, shown: 0, files: new Map<string, number>() };

  constructor(root: HTMLElement) {
    this.root = root;
    const canvas = root.querySelector<HTMLCanvasElement>('.js-hero-canvas');
    const viewport = root.querySelector<HTMLElement>('.js-hero-viewport');
    if (!canvas || !viewport) throw new Error('3Dの表示領域がありません。');
    this.canvas = canvas;
    this.viewport = viewport;
    const elements = [...root.querySelectorAll<HTMLElement>('.js-journey-shot')];
    // The first stop is the hero itself, so the page provides one element for each later stop.
    elements.forEach((element, order) => {
      const index = order + 1;
      const stop = houseStops[index];
      if (!stop || element.dataset.shot !== stop.id)
        throw new Error('場面の並びが3Dの順路と一致しません: ' + (element.dataset.shot ?? ''));
      const content = element.querySelector<HTMLElement>('.js-journey-content') ?? element;
      const heading = ['profile', 'career', 'works', 'links'].includes(stop.chapter)
        ? content.querySelector<HTMLElement>('.js-journey-title')
        : null;
      this.shots.push({
        element,
        content,
        stop,
        index,
        arrival: 0,
        departure: 0,
        heading,
        headingSpace: 0,
      });
    });
    if (this.shots.length !== houseStops.length - 1) throw new Error('場面の数が3Dの順路と一致しません。');
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
    this.renderer.toneMappingExposure = 1.0;
    // A soft studio environment gives the flat-shaded faces gentle variation instead of one grey. The daylight
    // sets how strongly, lower towards dusk.
    const environment = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = environment.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    room.dispose();
    environment.dispose();
    const kitchen = houseStops.find((item) => item.id === 'kitchen');
    if (kitchen) this.glassRest.position.set(...kitchen.position);
    this.glassRest.rotation.y = kitchen?.yaw ?? 0;
    this.attachProp(this.glass, this.glassRest, GLASS_REST_POSITION, new THREE.Quaternion());
    this.scene.add(this.world.group, this.actor, this.birds.group, this.glassRest);
    this.daylight = createDaylight(this.scene);
    this.observer = new ResizeObserver(this.handleViewportResize);
    this.initialize();
  }

  /** Smooth the desktop scene's edges. Phones render directly. */
  createComposer() {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new SMAAPass());
  }

  disposeComposer() {
    if (!this.composer) return;
    for (const pass of this.composer.passes) pass.dispose();
    this.composer.dispose();
    this.composer = null;
  }

  attachProp(prop: THREE.Object3D, parent: THREE.Object3D, position: THREE.Vector3, rotation: THREE.Quaternion) {
    if (prop.parent === parent) return;
    parent.add(prop);
    prop.position.copy(position);
    prop.quaternion.copy(rotation);
  }

  initialize() {
    this.observer.observe(this.viewport);
    for (const shot of this.shots) this.observer.observe(shot.content);
    this.attachEvent();
    this.splitTitles();
    this.handleViewportResize();
    void this.loadCharacter();
  }

  /**
   * Splits each heading the journey reveals into letters, which rise one after another from behind the line as
   * the heading comes into view. Words stay whole across line breaks. Screen readers keep the heading's words
   * through `aria-label`, and the letters are hidden from them.
   */
  splitTitles() {
    for (const title of this.root.querySelectorAll<HTMLElement>('.js-journey-title')) {
      if (this.shots.some((shot) => shot.heading === title)) continue;
      // The rendered text, so lines set as separate blocks (the name and "Portfolio") keep a space between them.
      const words = title.innerText.replace(/\s+/g, ' ').trim();
      if (!title.querySelector('[aria-label]')) title.setAttribute('aria-label', words);
      const letterCount = words.replace(/ /g, '').length;
      const texts: Text[] = [];
      const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (walker.currentNode instanceof Text) texts.push(walker.currentNode);
      let order = 0;
      for (const text of texts) {
        const fragment = document.createDocumentFragment();
        for (const part of text.data.split(/(\s+)/)) {
          if (!part.trim()) {
            fragment.append(part);
            continue;
          }
          const word = document.createElement('span');
          word.className = 'm-hero-scene__title-word';
          word.setAttribute('aria-hidden', 'true');
          for (const character of part) {
            const mask = document.createElement('span');
            mask.className = 'm-hero-scene__title-mask';
            const letter = document.createElement('span');
            letter.className = 'm-hero-scene__title-letter';
            letter.textContent = character;
            letter.style.setProperty('--letter-order', (order / letterCount).toFixed(3));
            mask.append(letter);
            word.append(mask);
            order++;
          }
          fragment.append(word);
        }
        text.replaceWith(fragment);
      }
    }
  }

  attachEvent() {
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
    window.addEventListener('pointermove', this.handleWindowPointerMove, { passive: true });
    document.addEventListener('pointerleave', this.handleDocumentPointerLeave);
    this.viewport.addEventListener('pointerdown', this.handleViewportPointerDown);
    this.viewport.addEventListener('pointerup', this.handleViewportPointerUp);
    this.viewport.addEventListener('pointercancel', this.handleViewportPointerUp);
    this.viewport.addEventListener('click', this.handleViewportClick);
    document.addEventListener('visibilitychange', this.handleDocumentVisibilityChange);
    window.addEventListener('pagehide', this.handleWindowPageHide);
    window.addEventListener('pageshow', this.handleWindowPageShow);
    document.addEventListener('click', this.handleDocumentClick);
    this.motionPreference.addEventListener('change', this.handleMotionPreferenceChange);
    this.canvas.addEventListener('webglcontextlost', this.handleCanvasContextLost);
  }

  detachEvent() {
    window.removeEventListener('scroll', this.handleWindowScroll);
    window.removeEventListener('pointermove', this.handleWindowPointerMove);
    document.removeEventListener('pointerleave', this.handleDocumentPointerLeave);
    this.viewport.removeEventListener('pointerdown', this.handleViewportPointerDown);
    this.viewport.removeEventListener('pointerup', this.handleViewportPointerUp);
    this.viewport.removeEventListener('pointercancel', this.handleViewportPointerUp);
    this.viewport.removeEventListener('click', this.handleViewportClick);
    document.removeEventListener('visibilitychange', this.handleDocumentVisibilityChange);
    window.removeEventListener('pagehide', this.handleWindowPageHide);
    window.removeEventListener('pageshow', this.handleWindowPageShow);
    document.removeEventListener('click', this.handleDocumentClick);
    this.motionPreference.removeEventListener('change', this.handleMotionPreferenceChange);
    this.canvas.removeEventListener('webglcontextlost', this.handleCanvasContextLost);
  }

  /** The monitor, the framed portrait, the stair signs and the television show the page's own content. */
  async createScreens() {
    const pending: Promise<void>[] = [];
    const useTexture = (mesh: THREE.Mesh, texture: THREE.Texture) => {
      if (!(mesh.material instanceof THREE.MeshBasicMaterial)) return;
      mesh.material.map = texture;
      mesh.material.color.set(0xffffff);
      mesh.material.needsUpdate = true;
    };
    const track = (texture: THREE.Texture) => {
      this.textures.push(texture);
      return texture;
    };
    useTexture(this.world.monitorScreen, track(createCanvasTexture(drawMonitorScreen())));
    this.tvTextures.standby = track(createCanvasTexture(drawStandbyScreen()));
    useTexture(this.world.tvScreen, this.tvTextures.standby);

    const profile = this.shots.find((shot) => shot.stop.id === 'profile');
    const portrait = profile?.element.dataset.picture;
    if (portrait) {
      pending.push(
        new THREE.TextureLoader().loadAsync(portrait).then((texture) => {
          if (this.isDestroyed) return texture.dispose();
          texture.colorSpace = THREE.SRGBColorSpace;
          useTexture(this.world.picture, track(texture));
          this.requestRender();
        }),
      );
    }

    for (const shot of this.shots) {
      const { signPeriod, signTitle, signRole } = shot.element.dataset;
      if (!signPeriod || !signTitle || !signRole) continue;
      if (!shot.stop.sign) continue;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 0.65),
        new THREE.MeshStandardMaterial({
          map: track(createCanvasTexture(drawYearSign(signPeriod, signTitle, signRole))),
          roughness: 0.9,
        }),
      );
      // On the east wall beside the stairs, a tread below where the person stops.
      sign.position.set(...shot.stop.sign);
      sign.rotation.y = -Math.PI / 2;
      sign.receiveShadow = true;
      this.world.group.add(sign);
    }

    const works = this.shots.filter((shot) => shot.element.dataset.screenTitle);
    works.forEach((shot, order) => {
      const { screenImage } = shot.element.dataset;
      const texture = track(createCanvasTexture(drawWorkScreen(null)));
      this.tvTextures.works[order] = texture;
      if (!screenImage) return;
      const image = new Image();
      image.decoding = 'async';
      image.src = screenImage;
      pending.push(
        image.decode().then(() => {
          if (this.isDestroyed) return;
          texture.image = drawWorkScreen(image);
          texture.needsUpdate = true;
          this.requestRender();
        }),
      );
    });
    await Promise.all(pending);
  }

  /** Places copies of the furniture models where house-world lists them. Copies share geometry and materials. */
  loadProps(loader: GLTFLoader) {
    const names = [...new Set(this.world.props.map((prop) => prop.model))];
    for (const name of names) this.loader.files.set(name, 0);
    const pending = names.map(async (name) => {
      const { scene: model } = await loader.loadAsync(PROP_MODELS[name], this.trackDownload(name));
      if (this.isDestroyed) {
        this.disposeObject(model);
        return;
      }
      // Attach completed models immediately so destroy() also owns partially loaded furniture.
      for (const prop of this.world.props.filter((item) => item.model === name)) {
        const copy = model.clone();
        copy.position.set(...prop.position);
        copy.rotation.y = prop.rotationY ?? 0;
        if (Array.isArray(prop.scale)) copy.scale.set(...prop.scale);
        else copy.scale.setScalar(prop.scale ?? 1);
        copy.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = !prop.isSky;
          object.receiveShadow = !prop.isSky;
          // Clouds must remain visible beyond the fog's far distance.
          if (prop.isSky)
            for (const material of Array.isArray(object.material) ? object.material : [object.material])
              material.fog = false;
        });
        this.world.group.add(copy);
      }
    });
    return pending;
  }

  async loadFigure(loader: GLTFLoader) {
    this.loader.files.set('figure', 0);
    const model = await loader.loadAsync('/assets/models/human-lowpoly-rigged.glb', this.trackDownload('figure'));
    if (this.isDestroyed) {
      this.disposeObject(model.scene);
      return null;
    }
    this.character = model.scene;
    this.actor.add(model.scene);
    return model;
  }

  async loadCharacter() {
    try {
      const status = this.root.querySelector<HTMLElement>('.js-hero-status');
      if (status) status.textContent = '3Dの家を読み込んでいます。';
      const count = this.countLoader();
      const draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG);
      const loader = new GLTFLoader().setDRACOLoader(draco);
      const models = [this.loadFigure(loader), ...this.loadProps(loader)] as const;
      // Wait for every model before releasing the shared decoder, even if one request fails.
      void Promise.allSettled(models).then(() => draco.dispose());
      const [model] = await Promise.all([...models, this.loadHeadings(), this.createScreens()]);
      this.loader.loaded = DOWNLOAD_SHARE;
      if (this.isDestroyed || !model) return;
      model.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          // The file carries no normals; each face has its own corners, so these come out flat, as drawn. The
          // shadows' normal bias reads them.
          object.geometry.computeVertexNormals();
          const originals = Array.isArray(object.material) ? object.material : [object.material];
          // The figure stays one plain grey; only the eyebrows and beard (material BrowBeard) are black.
          const isPainted = originals.some((material) => material.name === 'BrowBeard');
          for (const material of originals) material.dispose();
          object.material = new THREE.MeshStandardMaterial({
            color: isPainted ? 0x1f2022 : 0xb8b9b7,
            roughness: isPainted ? 0.9 : 0.78,
            flatShading: true,
          });
        }
        if (object instanceof THREE.Bone && ['Head', 'Neck'].includes(object.name))
          this.lookBones.push({
            bone: object,
            base: object.quaternion.clone(),
            weight: object.name === 'Head' ? 0.65 : 0.35,
          });
        if (object instanceof THREE.Bone && object.name === 'RightHand') this.rightHand = object;
        const mouthIndex = object instanceof THREE.Mesh ? object.morphTargetDictionary?.MouthClosed : undefined;
        if (object instanceof THREE.Mesh && mouthIndex !== undefined)
          this.mouths.push({ mesh: object, index: mouthIndex });
      });
      this.mixer = new THREE.AnimationMixer(model.scene);
      for (const clip of model.animations) {
        const action = this.mixer.clipAction(clip);
        if (SCRUBBED_CLIPS.includes(clip.name)) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        this.actions.set(clip.name, action);
      }
      for (const name of REQUIRED_CLIPS) {
        if (!this.actions.has(name)) throw new Error('必要なアニメーションがありません: ' + name);
      }
      this.isReady = true;
      await this.warmUp();
      this.loader.loaded = 1;
      await count;
      if (this.isDestroyed) return;
      if (status) status.textContent = '';
      const hashTarget = this.hashTarget(window.location.hash);
      if (hashTarget || this.motionPreference.matches) this.opening = 1;
      this.handleMotionPreferenceChange();
      // Enabling the journey changes the document height. Let layout and its scroll events settle under the
      // loader before placing a chapter, so a direct project URL opens on its television rather than flying in.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (hashTarget && this.root.contains(hashTarget)) this.scrollToTarget(hashTarget);
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (this.isDestroyed) return;
      this.handleWindowScroll();
      this.progress = this.goalProgress;
      this.progressVelocity = 0;
      this.render(0);
      this.root.classList.remove('m-hero-scene--loading');
      this.root.classList.add('m-hero-scene--ready');
      this.start();
    } catch (error) {
      console.warn('家の3D表示を初期化できませんでした。', error);
      this.destroy();
    }
  }

  async loadHeadings() {
    try {
      const font = await new FontLoader().loadAsync('/assets/font/noto-sans-jp/journey.typeface.json');
      if (this.isDestroyed) return;
      this.headings = createHouseHeadings(font);
      this.scene.add(this.headings.group);
      this.handleViewportResize();
    } catch (error) {
      // Keep the original HTML headings if the optional display font cannot be loaded.
      console.warn('立体見出しを読み込めないため、カード内の見出しを表示します。', error);
    }
  }

  /**
   * Prepares the drawing while the loader still covers the page: uploads every texture, compiles every material's
   * shaders, and draws a few stops through the whole pipeline once, preparing shadows for each kind of object.
   * Done later, each of these stalls the first frame that needs it.
   */
  async warmUp() {
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    });
    for (const texture of textures) this.renderer.initTexture(texture);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.isDestroyed) return;
    const { progress, opening, introductionElapsed } = this;
    this.opening = 1;
    this.introductionElapsed = 2;
    for (const id of WARM_UP_STOPS) {
      this.progress = houseStops.findIndex((stop) => stop.id === id);
      this.render(0);
    }
    this.progress = progress;
    this.opening = opening;
    this.introductionElapsed = introductionElapsed;
  }

  /** Closes the mouth, except while the figure sips from the glass. */
  moveMouth(action: string, actionProgress: number | null) {
    const progress = actionProgress ?? 0;
    const open =
      action === 'Drink'
        ? THREE.MathUtils.smoothstep(progress, ...DRINK_MOUTH.opening) *
          (1 - THREE.MathUtils.smoothstep(progress, ...DRINK_MOUTH.closing))
        : 0;
    for (const { mesh, index } of this.mouths) {
      if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[index] = 1 - open;
    }
  }

  /** A progress handler for one model file, which updates the share of the whole house loaded. */
  trackDownload(name: string) {
    return (event: ProgressEvent) => {
      if (!event.total) return;
      this.loader.files.set(name, Math.min(1, event.loaded / event.total));
      const shares = [...this.loader.files.values()];
      this.loader.loaded = (shares.reduce((sum, share) => sum + share, 0) / shares.length) * DOWNLOAD_SHARE;
    };
  }

  /** Climbs the loader's count after the download, and resolves once it shows 100. */
  countLoader() {
    const percent = this.root.querySelector<HTMLElement>('.js-hero-loader-percent');
    let last: number | null = null;
    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        const delta = last === null ? 0 : THREE.MathUtils.clamp((now - last) / 1000, 0, 0.1);
        last = now;
        const seconds = window.location.hash ? LOADER_COUNT_SECONDS.chapter : LOADER_COUNT_SECONDS.first;
        this.loader.shown = this.motionPreference.matches
          ? this.loader.loaded
          : Math.min(this.loader.loaded, this.loader.shown + delta / seconds);
        this.root.style.setProperty('--loader-progress', this.loader.shown.toFixed(4));
        if (percent) percent.textContent = String(Math.floor(this.loader.shown * 100));
        if (this.loader.shown >= 1 || this.isDestroyed) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  handleMotionPreferenceChange = () => {
    const isJourney = !this.motionPreference.matches && this.isReady;
    this.root.classList.toggle('m-hero-scene--journey', isJourney);
    this.root.classList.toggle('m-hero-scene--spatial-introduction', isJourney && this.headings !== null);
    // The journey shows its own chapter rail, so the header's links step aside.
    document.querySelector('.js-site-header')?.classList.toggle('site-header--with-rail', isJourney);
    this.handleViewportResize();
    this.handleWindowScroll();
    if (this.motionPreference.matches) {
      this.progress = 0;
      this.progressVelocity = 0;
      this.stop();
      this.render(0);
    } else this.start();
  };

  handleViewportResize = () => {
    this.width = this.viewport.clientWidth;
    this.height = this.viewport.clientHeight;
    if (!this.width || !this.height) return;
    this.renderer.setSize(this.width, this.height, false);
    if (this.width > 768 && !this.composer) this.createComposer();
    else if (this.width <= 768) this.disposeComposer();
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(this.width, this.height);
    const careerCard = this.shots.find((shot) => shot.stop.id === 'career-1')?.content;
    const introduction = this.root.querySelector<HTMLElement>('.js-hero-introduction');
    this.headings?.layout(
      this.width,
      this.height,
      careerCard?.getBoundingClientRect().right ?? 0,
      introduction?.getBoundingClientRect().left ?? 0,
    );
    // The camera arrives as a panel rises into the lower part of the screen, and leaves only once the panel's last
    // lines have scrolled up near the top, so the text is read while the view holds still. A tall panel never
    // pushes a stop's arrival before the previous one has left.
    let previousDeparture = -Infinity;
    for (const shot of this.shots) {
      this.layoutHeading(shot);
      const { top, bottom } = this.panelBounds(shot);
      // On phones, show the television briefly before the next work card enters the screen.
      const arrivalOffset = this.width <= 768 && shot.stop.chapter === 'works' ? 1.35 : 0.7;
      shot.arrival = Math.max(
        top + window.scrollY - this.height * arrivalOffset,
        previousDeparture + this.height * 0.3,
      );
      shot.departure = Math.max(shot.arrival + this.height * 0.25, bottom + window.scrollY - this.height * 0.3);
      previousDeparture = shot.departure;
    }
    this.handleWindowScroll();
    if (this.isReady) this.render(0);
  };

  layoutHeading(shot: Shot) {
    if (!shot.heading) return;
    shot.heading.classList.remove('p-home-panel__title--spatial');
    shot.element.classList.remove('p-home-shot--spatial-heading');
    shot.element.style.removeProperty('--heading-space');
    shot.headingSpace = 0;
    if (!this.headings || !this.root.classList.contains('m-hero-scene--journey')) return;
    const style = getComputedStyle(shot.heading);
    const space =
      shot.heading.getBoundingClientRect().height +
      Number.parseFloat(style.marginTop) +
      Number.parseFloat(style.marginBottom);
    shot.heading.classList.add('p-home-panel__title--spatial');
    // Move the title's footprint outside the card, preserving the original scroll and career stop timings.
    shot.headingSpace = space;
    shot.element.classList.add('p-home-shot--spatial-heading');
    shot.element.style.setProperty('--heading-space', space + 'px');
  }

  handleWindowScroll = () => {
    if (!this.isReady) return;
    this.updateGoal();
    if (this.motionPreference.matches) {
      this.progress = this.goalProgress;
      this.progressVelocity = 0;
      this.render(0);
    } else this.start();
  };

  /** Reads the scroll position into the stop the journey heads for, and whether the scene is on screen. */
  updateGoal() {
    const y = window.scrollY;
    let progress = 0;
    let departure = this.root.getBoundingClientRect().top + y + this.height * 0.15;
    for (const shot of this.shots) {
      if (y < shot.arrival) {
        progress =
          shot.index - 1 + THREE.MathUtils.clamp((y - departure) / Math.max(1, shot.arrival - departure), 0, 1);
        break;
      }
      progress = shot.index;
      departure = shot.departure;
    }
    if (Math.abs(progress - this.goalProgress) > 0.0001) this.travelDirection = progress >= this.goalProgress ? 1 : -1;
    this.goalProgress = this.motionPreference.matches ? 0 : progress;
    const rect = this.root.getBoundingClientRect();
    this.isVisible = rect.bottom > 100 && rect.top < this.height;
    this.root.classList.toggle('m-hero-scene--offscreen', !this.isVisible);
  }

  hashTarget(hash: string) {
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  }

  handleDocumentClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (
      !this.isReady ||
      this.root.classList.contains('m-hero-scene--loading') ||
      this.motionPreference.matches ||
      this.veil.goal > 0
    )
      return;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (
      !link ||
      !link.hash ||
      link.origin !== window.location.origin ||
      link.pathname !== window.location.pathname ||
      link.search !== window.location.search ||
      (link.target && link.target !== '_self') ||
      link.hasAttribute('download')
    )
      return;
    const target = this.hashTarget(link.hash);
    if (!target || !this.root.contains(target)) return;
    this.opening = 1;
    const shot = this.findShot(target);
    const isNearby = Math.abs((shot?.index ?? 0) - this.progress) < VEIL.minStops;
    const isPanelAnchor = this.width <= 768 && shot && ['career', 'works'].includes(shot.stop.chapter);
    if (isNearby && !isPanelAnchor) return;
    event.preventDefault();
    window.history.pushState(null, '', link.hash);
    if (isNearby) {
      this.scrollToTarget(target);
      this.handleWindowScroll();
      return;
    }
    this.veil.target = target;
    this.veil.goal = 1;
    this.start();
  };

  handleWindowPointerMove = (event: PointerEvent) => {
    this.pointer.set((event.clientX / this.width) * 2 - 1, (event.clientY / this.height) * 2 - 1);
    if (!this.drag.isActive) {
      const isOverScene = event.target instanceof Node && this.viewport.contains(event.target);
      const isOverWork = isOverScene && event.pointerType === 'mouse' && this.workOnScreen(event) !== null;
      this.root.classList.toggle('m-hero-scene--pointing', isOverWork);
      return;
    }
    this.drag.travel = Math.max(
      this.drag.travel,
      this.drag.start.distanceTo(new THREE.Vector2(event.clientX, event.clientY)),
    );
    // A drag across the whole screen swings the camera about 115 degrees round and 40 degrees up or down.
    this.drag.goal.set(
      THREE.MathUtils.clamp((-(event.clientX - this.drag.start.x) / this.width) * 2, -1, 1),
      THREE.MathUtils.clamp(((event.clientY - this.drag.start.y) / this.height) * 1.4, -0.35, 0.5),
    );
  };

  /** Only a mouse drags the scene: on touch screens the same gesture scrolls the page. */
  handleViewportPointerDown = (event: PointerEvent) => {
    this.drag.travel = 0;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !this.isReady || this.opening < 1) return;
    if (this.motionPreference.matches || (event.target instanceof Element && event.target.closest('a, button'))) return;
    event.preventDefault();
    this.drag.isActive = true;
    this.drag.start.set(event.clientX, event.clientY);
    this.viewport.setPointerCapture(event.pointerId);
    this.root.classList.add('m-hero-scene--dragging');
  };

  handleViewportPointerUp = (event: PointerEvent) => {
    if (!this.drag.isActive) return;
    this.drag.isActive = false;
    this.drag.goal.set(0, 0);
    if (this.viewport.hasPointerCapture(event.pointerId)) this.viewport.releasePointerCapture(event.pointerId);
    this.root.classList.remove('m-hero-scene--dragging');
  };

  /** Clicking or tapping the television at a project's stop opens that project's page. */
  handleViewportClick = (event: MouseEvent) => {
    if (this.drag.travel > 6 || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest('a, button, summary')) return;
    const url = this.workOnScreen(event);
    if (url) leavePage(url);
  };

  /**
   * The page of the project on the television, when the journey rests at its stop and the pointer is over the
   * screen; otherwise null.
   */
  workOnScreen(event: MouseEvent) {
    if (
      !this.isReady ||
      this.opening < 1 ||
      this.veil.goal > 0 ||
      this.television.power.value < 1 ||
      this.television.switching.value > 0.001
    )
      return null;
    const index = Math.round(this.progress);
    if (Math.abs(this.progress - index) > 0.15) return null;
    const shot = this.shots.find((item) => item.index === index && item.element.dataset.screenTitle);
    const link = shot?.element.querySelector<HTMLAnchorElement>('.p-home-work__media');
    if (!link) return null;
    const rect = this.canvas.getBoundingClientRect();
    const point = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(point, this.camera);
    return this.raycaster.intersectObject(this.world.tvScreen, false).length > 0 ? link.href : null;
  }

  handleDocumentPointerLeave = () => {
    this.pointer.set(0, 0);
  };

  handleDocumentVisibilityChange = () => {
    if (document.hidden) this.stop();
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
    const action = this.actions.get(name) ?? this.actions.get(CLIP_FALLBACKS[name] ?? 'Idle');
    if (!action || action === this.action) return;
    this.action?.stop();
    action.reset().play();
    this.action = action;
  }

  /** Props stay where they were put down; the hand only takes them between the grab and release frames. */
  placeProps(action: string, actionProgress: number | null) {
    const progress = actionProgress ?? 0;
    const hand = this.rightHand;
    const isDrinking =
      action === 'Drink' && this.actions.has('Drink') && progress >= DRINK_GRAB && progress <= DRINK_RELEASE;
    if (hand && isDrinking) this.attachProp(this.glass, hand, GLASS_OFFSET, GLASS_ROTATION);
    else this.attachProp(this.glass, this.glassRest, GLASS_REST_POSITION, new THREE.Quaternion());
  }

  /** Stay black until the seat is reached, then open the first picture and keep later channel changes. */
  updateTelevision(delta: number) {
    const material = this.world.tvScreen.material;
    if (!(material instanceof THREE.MeshBasicMaterial)) return;
    const firstWork = houseStops.findIndex((stop) => stop.id === 'works-1');
    const total = this.tvTextures.works.length;
    const isOn = this.progress > WORKS_SEATED_PROGRESS && this.progress < firstWork + total - 0.5;
    const switches = Array.from({ length: Math.max(0, total - 1) }, (_, order) => firstWork + order + 0.5);
    const channel = switches.filter((point) => this.progress >= point).length;
    const texture = (isOn ? this.tvTextures.works[channel] : null) ?? this.tvTextures.standby;
    if (texture && material.map !== texture) {
      if (isOn && this.television.power.value >= 1 && material.map !== this.tvTextures.standby)
        this.television.switching.value = 1;
      material.map = texture;
      material.needsUpdate = true;
    }
    this.television.time.value += delta;
    this.television.switching.value = isOn ? Math.max(0, this.television.switching.value - delta / 0.42) : 0;
    this.television.channel.value = 1 - 0.65 * this.television.switching.value;
    if (!isOn) this.television.power.value = 0;
    else if (this.root.classList.contains('m-hero-scene--ready') && this.veil.amount < 0.2)
      this.television.power.value = Math.min(1, this.television.power.value + delta / 0.95);
  }

  requestRender() {
    if (!this.frame && this.isReady) this.render(0);
  }

  render(delta: number) {
    if (this.isDestroyed || !this.isReady) return;
    const tour = sampleHouseTour(this.progress);
    this.actor.position.copy(tour.position);
    const isReversed = tour.action === 'Walk' && this.travelDirection < 0;
    const yaw = tour.yaw + (isReversed ? Math.PI : 0);
    const difference = Math.atan2(Math.sin(yaw - this.actor.rotation.y), Math.cos(yaw - this.actor.rotation.y));
    this.actor.rotation.y += delta > 0 ? difference * (1 - Math.exp(-delta * 9)) : difference;
    this.play(tour.action);
    for (const { bone, base } of this.lookBones) bone.quaternion.copy(base);
    if (tour.actionProgress !== null && this.action)
      this.action.time = this.action.getClip().duration * Math.min(0.999, tour.actionProgress);
    const isMoving = Math.abs(this.goalProgress - this.progress) > 0.0001;
    this.mixer?.update(tour.actionProgress !== null || (tour.action === 'Walk' && !isMoving) ? 0 : delta);
    for (const item of this.lookBones) item.base.copy(item.bone.quaternion);
    // Gaze is limited to the neck and head. Eyes remain part of the supplied model.
    const gaze = GAZE_CLIPS.includes(tour.action) ? 1 : 0;
    this.headYaw = THREE.MathUtils.damp(this.headYaw, this.pointer.x * 0.2 * gaze, 5, delta);
    this.headPitch = THREE.MathUtils.damp(this.headPitch, this.pointer.y * 0.1 * gaze, 5, delta);
    for (const { bone, weight } of this.lookBones) {
      bone.quaternion.multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(this.headPitch * weight, this.headYaw * weight, 0)),
      );
    }
    this.placeProps(tour.action, tour.actionProgress);
    this.moveMouth(tour.action, tour.actionProgress);
    this.world.chair.position.x = -3 + CHAIR_PUSH * tour.chair;
    this.elapsed += this.motionPreference.matches ? 0 : delta;
    this.birds.update(this.elapsed);
    this.world.fanBlades.rotation.y = this.elapsed * 1.4;
    this.daylight.update(this.progress);
    this.updateTelevision(delta);
    this.world.door.rotation.y = -tour.door * 1.35;

    // A small drift with the pointer keeps resting shots alive without moving the composition.
    this.parallax.x = THREE.MathUtils.damp(this.parallax.x, this.pointer.x * tour.focus, 3, delta);
    this.parallax.y = THREE.MathUtils.damp(this.parallax.y, this.pointer.y * tour.focus, 3, delta);
    // During the opening the camera flies in from the garden and hands over to the hero shot.
    const isOpening = this.opening < 1;
    const opening = isOpening ? sampleOpening(this.opening) : null;
    const cameraTarget = opening?.target ?? tour.target;
    const cameraPosition = this.swingCamera(opening?.camera ?? tour.camera, cameraTarget, delta);
    const fov = opening?.fov ?? tour.fov;
    const settled = THREE.MathUtils.smoothstep(this.opening, 0.78, 1);
    const shift = tour.shift * settled;
    // Like a camera operator, the pan follows a moving subject a moment late and then catches up. Only a still
    // frame (on load or a resize), the opening flight and a cut behind the veil take the target at once.
    if (delta === 0 || isOpening || this.veil.settlingFrames > 0) this.followTarget.copy(cameraTarget);
    else this.followTarget.lerp(cameraTarget, 1 - Math.exp(-delta * 5));
    const forward = this.followTarget.clone().sub(cameraPosition).normalize();
    const right = forward.clone().cross(this.camera.up).normalize();
    this.camera.position
      .copy(cameraPosition)
      .addScaledVector(right, this.parallax.x * 0.06)
      .addScaledVector(this.camera.up, -this.parallax.y * 0.04);
    this.camera.lookAt(this.followTarget);

    const isNarrow = this.width <= 768;
    const firstArrival = this.shots[0]?.arrival || this.height;
    const reading = this.motionPreference.matches
      ? 0
      : THREE.MathUtils.smoothstep(window.scrollY, firstArrival - this.height * 0.65, firstArrival);
    this.root.classList.toggle('m-hero-scene--reading', reading > 0.1);
    const aspect = this.width / this.height;
    this.camera.aspect = aspect;
    // Tall viewports widen the lens so a screen or a room keeps its full width in frame.
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * Math.max(1, 1.5 / aspect);
    this.camera.fov = Math.min(80, THREE.MathUtils.radToDeg(Math.atan(halfHeight)) * 2);
    // The subject moves away from the panel: sideways on wide screens, and on phones up into the top half of the
    // screen, above the card that rises from the bottom. Between stops the view returns to the centre.
    const isWork = houseStops[tour.stopIndex].chapter === 'works';
    this.camera.setViewOffset(
      this.width,
      this.height,
      isNarrow ? 0 : this.width * shift * 0.18,
      isNarrow ? this.height * (isWork ? 0.24 : 0.2) * tour.focus * settled : 0,
      this.width,
      this.height,
    );
    this.camera.updateProjectionMatrix();
    const isShowing = this.root.classList.contains('m-hero-scene--ready');
    if (isShowing && this.opening >= 0.94 && (this.progress < 0.4 || this.introductionElapsed > 0))
      this.introductionElapsed += delta;
    this.headings?.update(this.progress, !this.motionPreference.matches, this.introductionElapsed, isShowing);
    if (this.composer && !isNarrow) {
      this.renderer.setViewport(0, 0, this.width, this.height);
      this.composer.render(delta);
    } else {
      this.renderer.setViewport(0, 0, this.width, this.height);
      this.renderer.render(this.scene, this.camera);
    }

    // Only the HTML fallback fades with the scroll. Spatial headings remain in the house after appearing.
    const introduction =
      (1 - THREE.MathUtils.smoothstep(this.progress, 0.02, 0.4)) * THREE.MathUtils.smoothstep(this.opening, 0.08, 0.3);
    this.root.style.setProperty('--intro-opacity', introduction.toFixed(3));
    this.root.style.setProperty('--journey-progress', (this.progress / (houseStops.length - 1)).toFixed(4));
    this.root.style.setProperty('--rail-progress', railProgress(this.progress).toFixed(4));
    // A panel shows while it is on screen to be read: it fades in as it rises from the bottom edge and fades out
    // only as its last lines leave the top.
    for (const shot of this.shots) {
      const { top, bottom } = this.panelBounds(shot);
      const entering = 1 - THREE.MathUtils.smoothstep(top, this.height * 0.75, this.height * 0.98);
      const leaving = THREE.MathUtils.smoothstep(bottom, this.height * 0.06, this.height * 0.25);
      shot.content.style.setProperty('--shot-focus', Math.min(entering, leaving).toFixed(3));
    }
    this.updateLabels(tour.stopIndex);
  }

  /**
   * The camera swung round its target by the drag: about the vertical, then up or down. It follows the pointer
   * closely while dragging and settles back more gently after release. Indoors it stays inside the walls.
   */
  swingCamera(position: THREE.Vector3, target: THREE.Vector3, delta: number) {
    const ease = this.drag.isActive ? 10 : 4;
    this.drag.swing.x = THREE.MathUtils.damp(this.drag.swing.x, this.drag.goal.x, ease, delta);
    this.drag.swing.y = THREE.MathUtils.damp(this.drag.swing.y, this.drag.goal.y, ease, delta);
    if (Math.abs(this.drag.swing.x) < 0.0001 && Math.abs(this.drag.swing.y) < 0.0001) return position;
    const offset = position.clone().sub(target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.drag.swing.x);
    const side = offset
      .clone()
      .cross(new THREE.Vector3(0, 1, 0))
      .normalize();
    offset.applyAxisAngle(side, -this.drag.swing.y);
    const swung = target.clone().add(offset);
    const isIndoors = Math.abs(position.x) < 4.85 && position.z > -3.85 && position.z < 5.05;
    if (isIndoors) {
      swung.x = THREE.MathUtils.clamp(swung.x, -4.8, 4.8);
      swung.z = THREE.MathUtils.clamp(swung.z, -3.8, 5.0);
      swung.y = THREE.MathUtils.clamp(swung.y, position.y < 3 ? 0.3 : 3.3, position.y < 3 ? 2.7 : 5.8);
    }
    return swung;
  }

  /** A panel's place in the viewport, without the small slide it makes while fading in. */
  panelBounds(shot: Shot) {
    const top = shot.element.getBoundingClientRect().top + shot.content.offsetTop - shot.headingSpace;
    return { top, bottom: top + shot.content.offsetHeight + shot.headingSpace };
  }

  findShot(target: HTMLElement) {
    if (target === this.root) return undefined;
    return this.shots.find((shot) => shot.element.contains(target) || target.contains(shot.element));
  }

  scrollToTarget(target: HTMLElement) {
    const shot = this.findShot(target);
    if (
      this.width <= 768 &&
      shot &&
      ['career', 'works'].includes(shot.stop.chapter) &&
      !this.motionPreference.matches
    ) {
      shot.content.scrollIntoView({ behavior: 'instant', block: 'start' });
      return;
    }
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  updateLabels(stopIndex: number) {
    const stop = houseStops[stopIndex];
    if (this.root.dataset.houseStop === stop.id) return;
    this.root.dataset.houseStop = stop.id;
    const chapter = CHAPTERS.indexOf(stop.chapter);
    const nextChapter = CHAPTERS[chapter + 1];
    const label = this.root.querySelector<HTMLElement>('.js-journey-label');
    if (label) label.textContent = stop.label;
    const next = this.root.querySelector<HTMLAnchorElement>('.js-journey-next');
    if (next) {
      next.href = '#' + (nextChapter ?? 'top');
      next.classList.toggle('m-hero-scene__scroll--back', !nextChapter);
    }
    const nextLabel = this.root.querySelector<HTMLElement>('.js-journey-next-label');
    if (nextLabel) nextLabel.textContent = nextChapter ? 'Scroll to explore' : 'Back to top';
    for (const link of document.querySelectorAll<HTMLAnchorElement>('.js-house-nav-link')) {
      if (link.hash === '#' + stop.chapter) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    for (const link of this.root.querySelectorAll<HTMLAnchorElement>('.js-journey-rail-link'))
      link.classList.toggle('m-hero-scene__rail-link--current', link.hash === '#' + stop.chapter);
  }

  /**
   * Fades the veil towards its goal. Once it covers the view the page jumps to the chapter and the journey takes
   * its stop at once, holding it for a few frames while the smooth scroll settles, before the veil lifts.
   */
  updateVeil(delta: number) {
    const veil = this.veil;
    const seconds = veil.goal > veil.amount ? VEIL.inSeconds : VEIL.outSeconds;
    veil.amount = THREE.MathUtils.clamp(
      veil.amount + Math.sign(veil.goal - veil.amount) * (delta / seconds),
      Math.min(veil.amount, veil.goal),
      Math.max(veil.amount, veil.goal),
    );
    if (veil.target && veil.amount >= 1) {
      this.scrollToTarget(veil.target);
      veil.target = null;
      veil.settlingFrames = 4;
      this.updateGoal();
      this.progress = this.goalProgress;
      this.progressVelocity = 0;
    } else if (veil.settlingFrames > 0) {
      this.progress = this.goalProgress;
      this.progressVelocity = 0;
      veil.settlingFrames--;
      if (veil.settlingFrames === 0) veil.goal = 0;
    }
    this.root.style.setProperty('--veil', THREE.MathUtils.smoothstep(veil.amount, 0, 1).toFixed(3));
  }

  start() {
    if (
      this.frame ||
      this.isDestroyed ||
      !this.isReady ||
      !this.isVisible ||
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
    // Scrolling during the opening speeds it up rather than fighting the visitor.
    if (this.opening < 1)
      this.opening = Math.min(1, this.opening + (delta / OPENING_SECONDS) * (this.goalProgress > 0.01 ? 5 : 1));
    // The journey follows the scroll on a spring with a speed limit, so even a fast flick of the wheel plays as
    // one continuous move. The limit rises with the distance left, so a jump across chapters does not drag on.
    this.updateVeil(delta);
    const maxSpeed = FOLLOW_SPEED.base + FOLLOW_SPEED.perStopBehind * Math.abs(this.goalProgress - this.progress);
    const followed = smoothDamp(this.progress, this.goalProgress, this.progressVelocity, maxSpeed, delta);
    this.progress = followed.value;
    this.progressVelocity = followed.velocity;
    if (Math.abs(this.goalProgress - this.progress) < 0.0001 && Math.abs(this.progressVelocity) < 0.001) {
      this.progress = this.goalProgress;
      this.progressVelocity = 0;
    }
    this.render(delta);
    if (this.isVisible && !document.hidden && !this.isDestroyed) this.frame = requestAnimationFrame(this.animate);
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
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
    for (const texture of textures) texture.dispose();
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.stop();
    this.detachEvent();
    this.observer.disconnect();
    this.mixer?.stopAllAction();
    if (this.character) this.mixer?.uncacheRoot(this.character);
    this.disposeObject(this.scene);
    for (const texture of this.textures) texture.dispose();
    this.textures.length = 0;
    this.environment?.dispose();
    this.disposeComposer();
    this.renderer.dispose();
    this.root.classList.remove(
      'm-hero-scene--journey',
      'm-hero-scene--spatial-introduction',
      'm-hero-scene--ready',
      'm-hero-scene--offscreen',
      'm-hero-scene--reading',
      'm-hero-scene--loading',
      'm-hero-scene--pointing',
      'm-hero-scene--dragging',
    );
    this.root.classList.add('m-hero-scene--fallback');
    document.querySelector('.js-site-header')?.classList.remove('site-header--with-rail');
    for (const property of ['--intro-opacity', '--journey-progress', '--rail-progress', '--veil'])
      this.root.style.removeProperty(property);
    for (const shot of this.shots) {
      shot.content.style.removeProperty('--shot-focus');
      this.layoutHeading(shot);
    }
    const status = this.root.querySelector<HTMLElement>('.js-hero-status');
    if (status) status.textContent = '3D表示を利用できないため、通常のページで表示しています。';
  }
}
