import * as THREE from 'three';

type Bird = {
  root: THREE.Group;
  leftWing: THREE.Object3D;
  rightWing: THREE.Object3D;
  takeoff: THREE.Vector3;
  radius: number;
  angle: number;
  height: number;
  speed: number;
};

/** Stylised size: real songbirds would be specks at the distance of the opening shot. */
const BIRD_SCALE = 1.7;
/**
 * For the first seconds the flock flies in from the right of the opening shot in a V, high over the front garden
 * about 13 m from the camera, so it reads as a flock crossing the sky rather than a few birds in the lens.
 */
const TAKEOFF_SECONDS = 6;
/** Where each bird enters, as a V behind the leader: back along the flight (+x) and out to either side (z). */
const FORMATION = [
  [0, 0, 0],
  [1.1, 0.15, 0.8],
  [1.1, 0.1, -0.8],
  [2.2, 0.3, 1.6],
] as const;
/**
 * The flock circles above the garden and the house. The circle passes over the corners of the house, so even the
 * lowest bird (0.45 m below the centre) stays clear of the roof ridge at 7.8 m.
 */
const CENTER = new THREE.Vector3(-1, 9.2, 2);

function createWing(material: THREE.Material, side: 1 | -1) {
  // A pivot at the shoulder so the wing beats around the body's long axis.
  const pivot = new THREE.Group();
  // Two triangles: the leading edge out to the tip, and the trailing feathers back to the body.
  const corners = [
    new THREE.Vector3(0, 0, 0.07),
    new THREE.Vector3(0, 0, -0.06),
    new THREE.Vector3(side * 0.34, 0.02, -0.02),
    new THREE.Vector3(0, 0, -0.06),
    new THREE.Vector3(side * 0.2, 0, -0.13),
    new THREE.Vector3(side * 0.34, 0.02, -0.02),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(corners);
  geometry.computeVertexNormals();
  const wing = new THREE.Mesh(geometry, material);
  wing.castShadow = true;
  pivot.add(wing);
  return pivot;
}

function createBird(materials: Record<'body' | 'wing' | 'beak', THREE.Material>) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), materials.body);
  body.scale.set(0.75, 0.7, 1.45);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.065, 0), materials.body);
  head.position.set(0, 0.05, 0.13);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 4), materials.beak);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.04, 0.21);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 3), materials.wing);
  tail.rotation.x = -Math.PI / 2;
  tail.scale.set(1.4, 0.35, 1);
  tail.position.set(0, 0.01, -0.17);
  const leftWing = createWing(materials.wing, 1);
  const rightWing = createWing(materials.wing, -1);
  leftWing.position.set(0.04, 0.03, 0.02);
  rightWing.position.set(-0.04, 0.03, 0.02);
  for (const mesh of [body, head, beak, tail]) mesh.castShadow = true;
  root.add(body, head, beak, tail, leftWing, rightWing);
  return { root, leftWing, rightWing };
}

/** Low-poly blue birds that fly in over the garden in the opening, then circle the house. */
export function createBirds() {
  const group = new THREE.Group();
  group.name = 'Birds';
  const materials = {
    body: new THREE.MeshStandardMaterial({ color: 0x304df0, roughness: 0.55, flatShading: true }),
    wing: new THREE.MeshStandardMaterial({
      color: 0x6f86ff,
      roughness: 0.6,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    beak: new THREE.MeshStandardMaterial({ color: 0xf2a33a, roughness: 0.6, flatShading: true }),
  };
  const birds: Bird[] = FORMATION.map((offset, index) => {
    const parts = createBird(materials);
    parts.root.scale.setScalar(BIRD_SCALE);
    group.add(parts.root);
    return {
      ...parts,
      takeoff: new THREE.Vector3(4.7, 7.6, 5.3).add(new THREE.Vector3(...offset)),
      radius: 8.5 + index * 0.9,
      angle: 1.2 + index * 0.2,
      height: index * 0.45,
      speed: 0.32 - index * 0.025,
    };
  });

  const position = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const join = new THREE.Vector3();
  const control = new THREE.Vector3();
  const orbitPoint = (bird: Bird, time: number, target: THREE.Vector3) => {
    const angle = bird.angle + time * bird.speed;
    return target.set(
      CENTER.x + Math.cos(angle) * bird.radius,
      CENTER.y + bird.height + Math.sin(time * 0.7 + bird.radius) * 0.45,
      CENTER.z + Math.sin(angle) * bird.radius * 0.8,
    );
  };
  // A curve from the entry point that meets the circle heading the same way, so the flock does not snap round.
  const pathPoint = (bird: Bird, time: number, target: THREE.Vector3) => {
    if (time >= TAKEOFF_SECONDS) return orbitPoint(bird, time, target);
    orbitPoint(bird, TAKEOFF_SECONDS, join);
    orbitPoint(bird, TAKEOFF_SECONDS - 0.5, control);
    control
      .sub(join)
      .setLength(join.distanceTo(bird.takeoff) * 0.5)
      .add(join);
    const progress = time / TAKEOFF_SECONDS;
    const rest = 1 - progress;
    return target
      .copy(bird.takeoff)
      .multiplyScalar(rest * rest)
      .addScaledVector(control, 2 * rest * progress)
      .addScaledVector(join, progress * progress);
  };

  const update = (time: number) => {
    birds.forEach((bird, index) => {
      pathPoint(bird, time, position);
      pathPoint(bird, time + 0.05, ahead);
      bird.root.position.copy(position);
      bird.root.lookAt(ahead);
      // Flap in bursts and glide in between, so the flock does not beat in unison.
      const cruising = THREE.MathUtils.smoothstep(time, TAKEOFF_SECONDS, TAKEOFF_SECONDS + 2);
      const glide = THREE.MathUtils.smoothstep(Math.sin(time * 0.9 + index * 1.7), 0.35, 0.85) * cruising;
      const beat = Math.sin(time * 15 + index * 2.1) * (1 - glide) * 0.95 + glide * 0.12;
      bird.leftWing.rotation.z = beat;
      bird.rightWing.rotation.z = -beat;
      bird.root.rotateZ(-0.35);
    });
  };
  update(0);
  return { group, update };
}
