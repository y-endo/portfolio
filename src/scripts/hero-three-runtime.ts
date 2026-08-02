import {
  AmbientLight,
  type BufferGeometry,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer,
} from "three";

export const startHeroThreeRuntime = (
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  { compact = false }: { compact?: boolean } = {},
) => {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !compact,
      powerPreference: compact ? "low-power" : "high-performance",
    });
  } catch {
    return;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.set(0, 0, 7.2);

  const ambientLight = new AmbientLight(0xf7f8f5, 2.4);
  const keyLight = new DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(-2.5, 3.2, 4.8);
  const rimLight = new DirectionalLight(0x315f68, 1.5);
  rimLight.position.set(3.5, -1.8, 2.4);
  scene.add(ambientLight, keyLight, rimLight);

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];

  const sculpture = new Group();
  sculpture.position.y = 0.12;

  const core = new Group();
  const coreGeometry = new IcosahedronGeometry(1.32, compact ? 1 : 2);
  geometries.push(coreGeometry);
  const shellMaterial = new MeshLambertMaterial({
    color: 0x315f68,
    flatShading: true,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  const coreMaterial = new MeshBasicMaterial({
    color: 0x315f68,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    wireframe: true,
  });
  materials.push(shellMaterial, coreMaterial);
  const shell = new Mesh(coreGeometry, shellMaterial);
  shell.scale.setScalar(0.985);
  core.add(shell);
  core.add(new Mesh(coreGeometry, coreMaterial));
  sculpture.add(core);

  const innerGeometry = new IcosahedronGeometry(0.7, 1);
  geometries.push(innerGeometry);
  const innerMaterial = new MeshBasicMaterial({
    color: 0x151817,
    transparent: true,
    opacity: 0.36,
    wireframe: true,
  });
  materials.push(innerMaterial);
  const innerCore = new Mesh(innerGeometry, innerMaterial);
  sculpture.add(innerCore);

  const markerGeometry = new SphereGeometry(
    0.055,
    compact ? 6 : 10,
    compact ? 4 : 8,
  );
  const markerMaterial = new MeshBasicMaterial({ color: 0x315f68 });
  const orbitTube = compact ? 0.006 : 0.007;
  geometries.push(markerGeometry);
  materials.push(markerMaterial);

  type OrbitOptions = {
    radius: number;
    color: number;
    opacity: number;
    tilt: [number, number, number];
    markerOffset: number;
    speed: number;
    phase: number;
  };

  const createOrbit = (options: OrbitOptions) => {
    const group = new Group();
    group.rotation.set(...options.tilt);
    const pivot = new Group();
    pivot.add(group);

    const ringGeometry = new TorusGeometry(
      options.radius,
      orbitTube,
      compact ? 4 : 6,
      compact ? 72 : 144,
    );
    const ringMaterial = new MeshBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: options.opacity,
    });
    const ring = new Mesh(ringGeometry, ringMaterial);
    group.add(ring);

    const satellite = new Mesh(markerGeometry, markerMaterial);
    group.add(satellite);

    const counterSatellite = new Mesh(markerGeometry, markerMaterial);
    counterSatellite.scale.setScalar(0.48);
    group.add(counterSatellite);

    geometries.push(ringGeometry);
    materials.push(ringMaterial);
    sculpture.add(pivot);

    return {
      ...options,
      pivot,
      group,
      satellite,
      counterSatellite,
    };
  };

  const orbitA = createOrbit({
    radius: 2.02,
    color: 0x626a67,
    opacity: 0.4,
    tilt: [1.08, 0.14, 0.2],
    markerOffset: 0.86,
    speed: 0.31,
    phase: 0.4,
  });
  const orbitB = createOrbit({
    radius: 1.82,
    color: 0x315f68,
    opacity: 0.3,
    tilt: [0.26, 1.14, -0.18],
    markerOffset: 0.58,
    speed: -0.24,
    phase: 2.3,
  });
  const orbitC = createOrbit({
    radius: 2.26,
    color: 0x151817,
    opacity: 0.18,
    tilt: [0.72, 0.6, 1.12],
    markerOffset: 1.12,
    speed: 0.18,
    phase: 4.2,
  });
  scene.add(sculpture);

  let frame = 0;
  let visible = true;
  let disposed = false;
  let lastRenderedAt = 0;
  let rendererWidth = 0;
  let rendererHeight = 0;
  const frameInterval = compact ? 1000 / 30 : 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width === 0 || height === 0) return;

    const widthChanged = width !== rendererWidth;
    const heightChanged = height !== rendererHeight;
    if (!widthChanged && (!heightChanged || compact)) return;

    rendererWidth = width;
    rendererHeight = height;
    renderer.setPixelRatio(
      compact ? 1 : Math.min(window.devicePixelRatio || 1, 1.5),
    );
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const render = (time: number) => {
    if (disposed || !visible || document.hidden) return;
    if (
      frameInterval > 0 &&
      lastRenderedAt > 0 &&
      time - lastRenderedAt < frameInterval
    ) {
      frame = window.requestAnimationFrame(render);
      return;
    }
    lastRenderedAt = time;
    const elapsed = time * 0.001;

    core.rotation.x = 0.34 + elapsed * 0.07;
    core.rotation.y = elapsed * 0.12;
    shellMaterial.opacity = 0.1 + Math.sin(elapsed * 0.7) * 0.025;
    innerCore.rotation.x = -elapsed * 0.12;
    innerCore.rotation.z = elapsed * 0.16;

    for (const [index, orbit] of [orbitA, orbitB, orbitC].entries()) {
      const angle = orbit.phase + elapsed * orbit.speed;
      orbit.satellite.position.set(
        Math.cos(angle + orbit.markerOffset) * orbit.radius,
        Math.sin(angle + orbit.markerOffset) * orbit.radius,
        0,
      );
      orbit.counterSatellite.position.set(
        Math.cos(angle + Math.PI * 1.16) * orbit.radius,
        Math.sin(angle + Math.PI * 1.16) * orbit.radius,
        0,
      );
      orbit.pivot.rotation.x =
        Math.sin(elapsed * (0.12 + index * 0.018) + orbit.phase) * 0.2;
      orbit.pivot.rotation.y =
        elapsed * orbit.speed * 0.38 + Math.cos(elapsed * 0.09 + index) * 0.12;
      orbit.pivot.rotation.z = Math.sin(elapsed * 0.1 + index * 1.7) * 0.09;
    }
    renderer.render(scene, camera);
    frame = window.requestAnimationFrame(render);
  };

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible && !document.hidden) {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(render);
    } else {
      window.cancelAnimationFrame(frame);
    }
  });
  visibilityObserver.observe(root);

  const handleVisibilityChange = () => {
    window.cancelAnimationFrame(frame);
    if (visible && !document.hidden) {
      frame = window.requestAnimationFrame(render);
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const suspend = () => {
    window.cancelAnimationFrame(frame);
  };

  const resume = () => {
    if (disposed) return;
    lastRenderedAt = 0;
    resize();
    renderer.render(scene, camera);
    window.cancelAnimationFrame(frame);
    if (visible && !document.hidden) {
      frame = window.requestAnimationFrame(render);
    }
  };

  const handlePageHide = (event: PageTransitionEvent) => {
    if (event.persisted) {
      suspend();
      return;
    }
    dispose();
  };

  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) resume();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(frame);
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("pageshow", handlePageShow);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    renderer.dispose();
  };

  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
  canvas.addEventListener("webglcontextlost", () => {
    root.dataset.webglReady = "false";
    root.classList.remove("hero-scene--ready");
    dispose();
  });

  resize();
  renderer.render(scene, camera);
  root.dataset.webglReady = "true";
  root.classList.add("hero-scene--ready");
  root.dataset.heroInstrumented = "true";
  root.dataset.heroOrbitAccents = "markers-only";
  root.dataset.heroOrbitProfile = "thin-uniform-centered";
  root.dataset.heroQuality = compact ? "mobile-lite" : "desktop";
  root.dataset.heroFpsCap = compact ? "30" : "display";
  frame = window.requestAnimationFrame(render);
};
