import * as THREE from 'three';
import { houseStops } from './house-tour';

type Daylight = {
  /** The sky dome straight up and at the horizon; the fog and background take the horizon. */
  zenith: number;
  horizon: number;
  sun: number;
  sunIntensity: number;
  /** Where the sun shines from, relative to the middle of the house. */
  sunFrom: THREE.Vector3Tuple;
  skyLight: number;
  groundLight: number;
  ambientIntensity: number;
  fillIntensity: number;
  /** The soft studio reflections that give flat faces their variation. */
  environmentIntensity: number;
  /** How far the lamps indoors are turned up, from 0 to 1. */
  lamps: number;
};

/**
 * The visit runs from morning in the study to dusk at the front door: the sun sinks and warms from chapter to
 * chapter, and the lamps come on for the last walk outside. The sun keeps to the west front of the house, which
 * lights the study and the stairs through their windows at every hour.
 */
const DAYLIGHT: [string, Daylight][] = [
  [
    'top',
    {
      zenith: 0x4c9af2,
      horizon: 0xd4ebfb,
      sun: 0xfff3e4,
      sunIntensity: 3.1,
      sunFrom: [-7, 11, 8],
      skyLight: 0xf4f8ff,
      groundLight: 0xb9aa8d,
      ambientIntensity: 2.0,
      fillIntensity: 1.3,
      environmentIntensity: 0.45,
      lamps: 0,
    },
  ],
  [
    'career-2',
    {
      zenith: 0x3a8cf0,
      horizon: 0xc4e4fb,
      sun: 0xffefcf,
      sunIntensity: 3.3,
      sunFrom: [-7, 12, 8],
      skyLight: 0xf4f7ff,
      groundLight: 0xb9aa8d,
      ambientIntensity: 2.0,
      fillIntensity: 1.3,
      environmentIntensity: 0.45,
      lamps: 0,
    },
  ],
  [
    'works-2',
    {
      zenith: 0x4185e0,
      horizon: 0xd9e3ee,
      sun: 0xffe0b5,
      sunIntensity: 3.1,
      sunFrom: [-10, 8.5, 6],
      skyLight: 0xf6f3ee,
      groundLight: 0xb8a588,
      ambientIntensity: 1.9,
      fillIntensity: 1.2,
      environmentIntensity: 0.42,
      lamps: 0,
    },
  ],
  [
    'kitchen',
    {
      zenith: 0x4a76c6,
      horizon: 0xf2d9bd,
      sun: 0xffc184,
      sunIntensity: 2.7,
      sunFrom: [-12, 5.5, 5],
      skyLight: 0xf3e6d8,
      groundLight: 0xae9478,
      ambientIntensity: 1.7,
      fillIntensity: 1.0,
      environmentIntensity: 0.35,
      lamps: 0.35,
    },
  ],
  [
    'contact',
    {
      zenith: 0x2c4a8e,
      horizon: 0xf4b98e,
      sun: 0xff9455,
      sunIntensity: 1.6,
      sunFrom: [-13, 3.2, 4],
      skyLight: 0x8f9ad0,
      groundLight: 0x6e5a4a,
      ambientIntensity: 0.7,
      fillIntensity: 0.3,
      environmentIntensity: 0.14,
      lamps: 1,
    },
  ],
];
const KEYS = DAYLIGHT.map(([id, light]) => {
  const stop = houseStops.findIndex((item) => item.id === id);
  if (stop < 0) throw new Error('時間帯の停留点がありません: ' + id);
  return { stop, light };
});

/**
 * Warm lamps in the living room, the kitchen and the upstairs hall, seen through the windows at dusk, and the
 * porch light beside the front door, which lights the person waving goodbye in the closing shot.
 */
const LAMPS: { position: THREE.Vector3Tuple; intensity: number }[] = [
  { position: [-2.4, 2.4, 2.6], intensity: 24 },
  { position: [0.6, 2.4, -1.6], intensity: 16 },
  { position: [-1.2, 5.3, -1.6], intensity: 16 },
  { position: [2.2, 5.3, 2.4], intensity: 14 },
  { position: [2.15, 2.0, 5.8], intensity: 7 },
];
/** The porch light's fitting on the front wall, right of the door frame. */
const PORCH_LIGHT: THREE.Vector3Tuple = [2.15, 2.1, 5.46];

/** The sky, the sun and the lamps, set for each moment of the visit by `update(progress)`. */
export function createDaylight(scene: THREE.Scene) {
  const sky = new THREE.SphereGeometry(70, 24, 12);
  const skyPosition = sky.getAttribute('position');
  const skyColors = new THREE.BufferAttribute(new Float32Array(skyPosition.count * 3), 3);
  sky.setAttribute('color', skyColors);
  // A clear sky dome, bright and pale at the horizon. It ignores the fog so the opening shot from the garden has
  // a sky, and skips tone mapping, which would otherwise dull and darken its blues.
  const dome = new THREE.Mesh(
    sky,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const background = new THREE.Color();
  const fog = new THREE.Fog(0xffffff, 22, 55);
  scene.background = background;
  scene.fog = fog;

  const ambient = new THREE.HemisphereLight();
  const sunlight = new THREE.DirectionalLight();
  sunlight.target.position.set(0, 1.8, 0);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 32 });
  sunlight.shadow.normalBias = 0.025;
  sunlight.shadow.bias = -0.0002;
  sunlight.shadow.radius = 3;
  // Soft room fill prevents the roof from turning interiors into silhouettes.
  const fill = new THREE.DirectionalLight(0xffffff);
  fill.position.set(1, 5, 3);
  const lamps = LAMPS.map(({ position }) => {
    const lamp = new THREE.PointLight(0xffc68f, 0, 9, 2);
    lamp.position.set(...position);
    return lamp;
  });
  // A small black wall light with a frosted shade that glows as the lamps come on.
  const porch = new THREE.Group();
  porch.position.set(...PORCH_LIGHT);
  const shade = new THREE.MeshStandardMaterial({ color: 0xfff3dd, emissive: 0xffc27a, emissiveIntensity: 0 });
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.24, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6 }),
  );
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.17, 0.02), shade);
  glow.position.z = 0.051;
  porch.add(housing, glow);
  scene.add(dome, ambient, sunlight, sunlight.target, fill, porch, ...lamps);

  const colors = { zenith: new THREE.Color(), horizon: new THREE.Color(), from: new THREE.Color() };
  const mixColor = (from: number, to: number, amount: number, target: THREE.Color) =>
    target.set(from).lerp(colors.from.set(to), amount);
  let shown = -1;

  const update = (progress: number) => {
    // The light changes slowly, so small steps of the scroll leave the sky as it is.
    if (Math.abs(progress - shown) < 0.002) return;
    shown = progress;
    let index = 0;
    while (index < KEYS.length - 2 && progress > KEYS[index + 1].stop) index++;
    const from = KEYS[index];
    const to = KEYS[index + 1];
    const amount = THREE.MathUtils.smoothstep(progress, from.stop, to.stop);
    const a = from.light;
    const b = to.light;
    mixColor(a.zenith, b.zenith, amount, colors.zenith);
    mixColor(a.horizon, b.horizon, amount, colors.horizon);
    for (let i = 0; i < skyPosition.count; i++) {
      const height = THREE.MathUtils.clamp(skyPosition.getY(i) / 70, 0, 1);
      colors.from.copy(colors.horizon).lerp(colors.zenith, Math.pow(height, 0.3));
      skyColors.setXYZ(i, colors.from.r, colors.from.g, colors.from.b);
    }
    skyColors.needsUpdate = true;
    background.copy(colors.horizon);
    fog.color.copy(colors.horizon);
    mixColor(a.sun, b.sun, amount, sunlight.color);
    sunlight.intensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, amount);
    sunlight.position.set(
      THREE.MathUtils.lerp(a.sunFrom[0], b.sunFrom[0], amount),
      THREE.MathUtils.lerp(a.sunFrom[1], b.sunFrom[1], amount) + 1.8,
      THREE.MathUtils.lerp(a.sunFrom[2], b.sunFrom[2], amount),
    );
    mixColor(a.skyLight, b.skyLight, amount, ambient.color);
    mixColor(a.groundLight, b.groundLight, amount, ambient.groundColor);
    ambient.intensity = THREE.MathUtils.lerp(a.ambientIntensity, b.ambientIntensity, amount);
    fill.intensity = THREE.MathUtils.lerp(a.fillIntensity, b.fillIntensity, amount);
    scene.environmentIntensity = THREE.MathUtils.lerp(a.environmentIntensity, b.environmentIntensity, amount);
    const lampLevel = THREE.MathUtils.lerp(a.lamps, b.lamps, amount);
    lamps.forEach((lamp, i) => {
      lamp.intensity = LAMPS[i].intensity * lampLevel;
    });
    shade.emissiveIntensity = lampLevel * 2.5;
  };
  update(0);
  return { update };
}
