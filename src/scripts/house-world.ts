import * as THREE from 'three';

type Triple = [number, number, number];

export function createGameController() {
  const controller = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x303638, roughness: 0.65, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.045, 0.1), shell);
  controller.add(body);
  for (const x of [-0.11, 0.11]) {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.06, 0.12), shell);
    grip.position.set(x, -0.01, 0.01);
    grip.rotation.y = x * -1.2;
    controller.add(grip);
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 8), shell);
    thumb.position.set(x * 0.75, 0.03, 0);
    controller.add(thumb);
  }
  return controller;
}

/** The house uses metres. Ground = 0, upper floor = 3, front = +Z. */
export function createHouseWorld() {
  const group = new THREE.Group();
  group.name = 'House';
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);

  const facet = new THREE.IcosahedronGeometry(1, 0);
  const palette = {
    plaster: 0xf4f1e9,
    trim: 0xfffdf6,
    oak: 0xc69a68,
    oakLight: 0xd9b88d,
    oakDark: 0xac8156,
    cloth: 0xb5b4af,
    cushion: 0xc9c8c0,
    metal: 0x343a3c,
    screen: 0x17242b,
    code: 0x9db5ac,
    blue: 0x304df0,
    rug: 0x9baab6,
    leaf: 0x64814c,
    leafLight: 0xa5b975,
    leafDark: 0x415e3a,
    soil: 0x766452,
    ceramic: 0xe4dfd2,
    stone: 0xd1cec3,
    ground: 0xe8e8dc,
    paper: 0xf7f3e7,
  };
  type ColorName = keyof typeof palette;
  const materials = Object.fromEntries(
    Object.entries(palette).map(([name, color]) => [
      name,
      new THREE.MeshStandardMaterial({ color, roughness: name === 'metal' ? 0.45 : 0.86, flatShading: true }),
    ]),
  ) as Record<ColorName, THREE.MeshStandardMaterial>;
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 256;
  grainCanvas.height = 128;
  const grainContext = grainCanvas.getContext('2d');
  if (grainContext) {
    grainContext.fillStyle = '#f4efe8';
    grainContext.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 90; i++) {
      const y = (i * 17.37) % 128;
      grainContext.strokeStyle = i % 3 ? '#e4dacf' : '#faf6ef';
      grainContext.lineWidth = i % 4 ? 0.5 : 1;
      grainContext.beginPath();
      grainContext.moveTo(0, y);
      grainContext.bezierCurveTo(70, y + 2, 180, y - 2, 256, y + 1);
      grainContext.stroke();
    }
    const grain = new THREE.CanvasTexture(grainCanvas);
    grain.colorSpace = THREE.SRGBColorSpace;
    grain.anisotropy = 4;
    for (const name of ['oak', 'oakLight', 'oakDark'] as const) materials[name].map = grain;
  }
  const batches = new Map<
    string,
    { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] }
  >();
  const dummy = new THREE.Object3D();
  const add = (
    shape: THREE.BufferGeometry,
    color: ColorName,
    position: Triple,
    size: Triple,
    rotation: Triple = [0, 0, 0],
  ) => {
    const key = shape.uuid + color;
    let batch = batches.get(key);
    if (!batch) {
      batch = { geometry: shape, material: materials[color], matrices: [] };
      batches.set(key, batch);
    }
    dummy.position.set(...position);
    dummy.scale.set(...size);
    dummy.rotation.set(...rotation);
    dummy.updateMatrix();
    batch.matrices.push(dummy.matrix.clone());
  };
  const block = (color: ColorName, position: Triple, size: Triple, rotation: Triple = [0, 0, 0]) =>
    add(box, color, position, size, rotation);
  const beam = (color: ColorName, start: Triple, end: Triple, width: number) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    const euler = new THREE.Euler().setFromQuaternion(dummy.quaternion);
    block(
      color,
      a.add(b).multiplyScalar(0.5).toArray() as Triple,
      [width, new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end)), width],
      [euler.x, euler.y, euler.z],
    );
  };
  const plant = (x: number, y: number, z: number, size = 1) => {
    add(cylinder, 'ceramic', [x, y + 0.15 * size, z], [0.21 * size, 0.3 * size, 0.21 * size]);
    add(cylinder, 'soil', [x, y + 0.305 * size, z], [0.185 * size, 0.01, 0.185 * size]);
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4;
      const height = (0.5 + (i % 3) * 0.16) * size;
      const dx = Math.sin(angle) * 0.2 * size;
      const dz = Math.cos(angle) * 0.2 * size;
      beam('leafDark', [x, y + 0.25 * size, z], [x + dx, y + height, z + dz], 0.012 * size);
      add(
        facet,
        i % 2 ? 'leaf' : 'leafLight',
        [x + dx, y + height, z + dz],
        [0.16 * size, 0.25 * size, 0.1 * size],
        [0.3, angle, 0.4],
      );
    }
  };
  const floor = (left: number, right: number, rear: number, front: number, y: number) => {
    block('oakDark', [(left + right) / 2, y - 0.13, (rear + front) / 2], [right - left, 0.24, front - rear]);
    for (let z = rear; z < front; z += 0.27) {
      const row = Math.round((z - rear) / 0.27);
      for (let x = left - (row % 2) * 0.7; x < right; x += 1.4) {
        const start = Math.max(left, x);
        const width = Math.min(x + 1.4, right) - start;
        const depth = Math.min(0.27, front - z);
        block(
          (row + Math.round(x * 3)) % 3 ? 'oakLight' : 'oak',
          [start + width / 2, y, z + depth / 2],
          [width - 0.009, 0.018, depth - 0.006],
        );
      }
    }
  };

  // A continuous floor plan, with a real void above the staircase and living room.
  floor(-5, 5, -4, 4, 0);
  floor(-5, 0.8, -4, -0.3, 3);
  floor(0.8, 5, -4, -1.3, 3);
  floor(0.8, 2.9, -1.3, -0.3, 3);
  block('ground', [0, -0.3, 1], [34, 0.1, 32]);
  block('plaster', [0, 1.5, -4.1], [10.4, 3, 0.2]);
  block('plaster', [-1.5, 4.5, -4.1], [7, 3, 0.2]);
  block('plaster', [4.85, 4.5, -4.1], [0.7, 3, 0.2]);
  block('plaster', [3.25, 3.3, -4.1], [2.5, 0.6, 0.2]);
  block('plaster', [3.25, 5.85, -4.1], [2.5, 0.3, 0.2]);
  for (const x of [2.0, 3.25, 4.5]) block('trim', [x, 4.65, -4.03], [0.055, 2.1, 0.08]);
  for (const y of [3.6, 5.7]) block('trim', [3.25, y, -4.03], [2.5, 0.055, 0.08]);
  plant(4.55, 3.02, -3.55, 1.2);
  block('plaster', [5.1, 3, 0], [0.2, 6.2, 8.4]);
  block('trim', [0, 6.1, 0], [10.5, 0.2, 8.5]);
  // West wall: two large glazed openings, without opaque planes across them.
  for (const level of [0, 3]) {
    block('plaster', [-5.1, level + 0.28, 0], [0.2, 0.56, 8.2]);
    block('plaster', [-5.1, level + 2.88, 0], [0.2, 0.24, 8.2]);
    for (const z of [-3.92, -0.35, 3.92]) block('plaster', [-5.1, level + 1.65, z], [0.2, 2.3, 0.22]);
    for (const z of [-2.1, 1.8]) {
      block('trim', [-5.0, level + 0.57, z], [0.32, 0.08, 3.35]);
      block('trim', [-5.0, level + 2.72, z], [0.1, 0.06, 3.35]);
      block('trim', [-5.0, level + 1.65, z], [0.1, 2.15, 0.045]);
    }
  }
  // Study wall and an open door leading onto the landing.
  block('plaster', [0.8, 4.5, -3.3], [0.13, 3, 1.4]);
  block('plaster', [0.8, 4.5, -0.93], [0.13, 3, 1.25]);
  block('plaster', [0.8, 5.72, -2.1], [0.13, 0.56, 1.05]);
  for (const z of [-2.63, -1.57]) block('oakLight', [0.79, 4.22, z], [0.19, 2.45, 0.065]);
  block('oakLight', [0.79, 5.43, -2.1], [0.19, 0.07, 1.1]);
  block('oak', [0.28, 4.2, -1.59], [1.0, 2.38, 0.055]);
  block('metal', [-0.13, 4.15, -1.53], [0.13, 0.035, 0.04]);
  // Landing balusters and sloping stair rails.
  for (let x = -4.9; x < 2.9; x += 0.22) block('trim', [x, 3.48, -0.28], [0.025, 0.94, 0.025]);
  beam('oak', [-5, 3.98, -0.28], [2.9, 3.98, -0.28], 0.06);
  for (let i = 0; i < 15; i++) {
    const z = 3.36 - i * 0.32;
    const height = (i + 1) * 0.2;
    block('plaster', [3.62, height / 2 - 0.01, z], [1.25, height, 0.32]);
    block('oakLight', [3.62, height, z], [1.31, 0.035, 0.335]);
    for (const x of [2.96, 4.28]) block('trim', [x, height + 0.47, z], [0.025, 0.94, 0.025]);
  }
  for (const x of [2.96, 4.28]) beam('oak', [x, 1.16, 3.36], [x, 3.96, -1.12], 0.065);
  for (let z = -1.22; z < -0.3; z += 0.22) block('trim', [2.91, 3.48, z], [0.025, 0.94, 0.025]);
  beam('oak', [2.91, 3.98, -1.3], [2.91, 3.98, -0.28], 0.06);

  // Study workstation: its dimensions match the supplied Typing clip.
  block('oakLight', [-3.515, 3.671, -2.1], [0.72, 0.035, 1.6]);
  for (const x of [-3.8, -3.25]) for (const z of [-2.77, -1.43]) block('oak', [x, 3.33, z], [0.055, 0.65, 0.055]);
  block('metal', [-3.45, 3.705, -2.1], [0.14, 0.018, 0.4]);
  for (let i = 0; i < 6; i++)
    block('cloth', [-3.5 + (i % 2) * 0.055, 3.717, -2.25 + Math.floor(i / 2) * 0.11], [0.035, 0.006, 0.08]);
  block('metal', [-3.697, 4.026, -2.1], [0.04, 0.37, 0.61]);
  block('screen', [-3.672, 4.026, -2.1], [0.008, 0.325, 0.56]);
  for (let i = 0; i < 17; i++)
    block(
      i % 4 ? 'code' : 'blue',
      [-3.665, 4.16 - i * 0.017, -2.28 + (i % 3) * 0.018],
      [0.005, 0.005, 0.12 + (i % 5) * 0.046],
    );
  block('metal', [-3.73, 3.81, -2.1], [0.03, 0.22, 0.035]);
  block('metal', [-3.7, 3.7, -2.1], [0.2, 0.015, 0.27]);
  block('cloth', [-3.0, 3.375, -2.1], [0.42, 0.07, 0.46]);
  block('cloth', [-2.77, 3.67, -2.1], [0.08, 0.55, 0.46], [0, 0, -0.13]);
  add(cylinder, 'metal', [-3, 3.19, -2.1], [0.028, 0.32, 0.028]);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 0.4;
    const x = -3 + Math.sin(a) * 0.28;
    const z = -2.1 + Math.cos(a) * 0.28;
    beam('metal', [-3, 3.1, -2.1], [x, 3.07, z], 0.025);
    add(cylinder, 'metal', [x, 3.055, z], [0.04, 0.05, 0.04], [Math.PI / 2, 0, 0]);
  }
  block('oak', [-1.5, 3.65, -3.65], [2.3, 1.3, 0.5]);
  for (const y of [3.08, 3.65, 4.23]) block('oakLight', [-1.5, y, -3.36], [2.2, 0.04, 0.05]);
  for (let i = 0; i < 25; i++) {
    const x = -2.5 + (i % 13) * 0.16;
    const y = i < 13 ? 3.37 : 3.93;
    block(
      i % 4 === 0 ? 'rug' : i % 2 ? 'paper' : 'cloth',
      [x, y, -3.35],
      [0.105, 0.4 + (i % 3) * 0.04, 0.29],
      [0, 0, i % 7 === 0 ? 0.1 : 0],
    );
  }
  block('oakDark', [-1.15, 4.8, -3.63], [0.82, 0.94, 0.035]);
  block('paper', [-1.15, 4.8, -3.6], [0.75, 0.87, 0.018]);
  add(facet, 'rug', [-1.25, 4.82, -3.58], [0.21, 0.22, 0.005]);
  block('oakLight', [-1.0, 4.69, -3.57], [0.23, 0.4, 0.01]);
  plant(-2.35, 4.3, -3.6, 0.63);
  plant(-4.65, 3.02, -3.42, 1.35);
  plant(-3.55, 3.7, -1.55, 0.4);
  plant(1.42, 3.02, -3.4, 1.25);
  block('rug', [-1.0, 3.015, -0.82], [2.0, 0.012, 0.76]);

  // Living room, with a sofa facing the television on the west wall.
  block('rug', [-2.2, 0.02, 1.65], [3.8, 0.018, 3.4]);
  block('cloth', [-0.85, 0.24, 1.5], [1.0, 0.34, 2.7]);
  block('cloth', [-0.38, 0.65, 1.5], [0.2, 0.76, 2.85]);
  for (const z of [0.08, 2.92]) block('cloth', [-0.85, 0.5, z], [1.0, 0.56, 0.19]);
  for (const z of [0.58, 1.5, 2.42]) {
    block('cushion', [-1.0, 0.43, z], [0.78, 0.16, 0.86]);
    block('cushion', [-0.53, 0.73, z], [0.17, 0.6, 0.86], [0, 0, -0.13]);
  }
  block('rug', [-0.85, 0.69, 0.5], [0.23, 0.38, 0.42], [0.16, 0.12, -0.3]);
  block('oak', [-2.8, 0.39, 1.5], [1.0, 0.065, 1.65]);
  for (const x of [-3.15, -2.45]) for (const z of [0.85, 2.15]) block('oakDark', [x, 0.2, z], [0.05, 0.36, 0.05]);
  block('paper', [-2.8, 0.44, 1.85], [0.44, 0.035, 0.3], [0, 0.18, 0]);
  plant(-2.85, 0.43, 1.15, 0.38);
  block('oak', [-4.65, 0.3, 1.5], [0.55, 0.55, 2.3]);
  block('metal', [-4.74, 1.32, 1.5], [0.06, 1.05, 1.85]);
  block('screen', [-4.7, 1.32, 1.5], [0.01, 0.98, 1.78]);
  add(facet, 'rug', [-4.69, 1.32, 1.5], [0.006, 0.3, 0.65]);
  plant(-4.4, 0.02, 3.42, 1.7);

  // Oak kitchen and island. The walk route passes around the island's east end.
  for (let x = -4.4; x < 1.8; x += 0.82) {
    block('oak', [x, 0.43, -3.62], [0.79, 0.84, 0.65]);
    block('oakDark', [x + 0.25, 0.74, -3.285], [0.15, 0.018, 0.02]);
    block('trim', [x, 2.1, -3.77], [0.79, 0.8, 0.4]);
  }
  block('ceramic', [-1.45, 0.89, -3.62], [6.85, 0.06, 0.76]);
  block('metal', [-2.75, 0.928, -3.56], [0.63, 0.015, 0.44]);
  block('cloth', [-2.75, 0.935, -3.56], [0.52, 0.012, 0.32]);
  beam('metal', [-2.75, 0.94, -3.83], [-2.75, 1.22, -3.83], 0.025);
  beam('metal', [-2.75, 1.22, -3.83], [-2.75, 1.22, -3.61], 0.025);
  block('metal', [-0.65, 0.928, -3.6], [0.85, 0.018, 0.47]);
  for (let i = 0; i < 4; i++)
    add(cylinder, 'cloth', [-0.88 + (i % 2) * 0.44, 0.941, -3.73 + Math.floor(i / 2) * 0.26], [0.095, 0.006, 0.095]);
  block('cloth', [2.12, 1.12, -3.55], [0.82, 2.24, 0.82]);
  block('metal', [1.85, 1.22, -3.12], [0.025, 0.48, 0.025]);
  block('oak', [-1.55, 0.45, -0.95], [3.75, 0.88, 1.06]);
  block('ceramic', [-1.55, 0.92, -0.95], [3.95, 0.07, 1.18]);
  for (const x of [-2.8, -1.55, -0.3]) {
    add(cylinder, 'oakDark', [x, 0.59, -0.05], [0.24, 0.07, 0.24]);
    for (const dx of [-0.15, 0.15])
      for (const dz of [-0.15, 0.15])
        beam('metal', [x + dx, 0.02, -0.05 + dz], [x + dx * 0.75, 0.56, -0.05 + dz * 0.75], 0.025);
  }
  add(cylinder, 'ceramic', [-1.7, 1.0, -0.95], [0.25, 0.12, 0.25]);
  for (let i = 0; i < 5; i++)
    add(facet, i % 2 ? 'leafLight' : 'oak', [-1.85 + i * 0.07, 1.08 + (i % 2) * 0.035, -0.95], [0.065, 0.065, 0.065]);
  add(cylinder, 'ceramic', [0.2, 1.04, -1.08], [0.055, 0.17, 0.055]);
  plant(-4.3, 0.94, -3.6, 0.55);

  // Front facade, blue entrance and a small garden, all visible in the last scene.
  for (const [x, width] of [
    [-4.8, 0.4],
    [1.9, 2.5],
    [4.7, 0.6],
  ])
    block('plaster', [x, 1.5, 4.1], [width, 3, 0.2]);
  block('plaster', [-1.95, 0.25, 4.1], [5.3, 0.5, 0.2]);
  block('plaster', [-1.95, 2.88, 4.1], [5.3, 0.24, 0.2]);
  block('plaster', [3.75, 2.75, 4.1], [1.25, 0.5, 0.2]);
  block('plaster', [0, 3.25, 4.1], [10, 0.5, 0.2]);
  block('plaster', [-4.8, 4.75, 4.1], [0.4, 2.5, 0.2]);
  block('plaster', [2.85, 4.75, 4.1], [4.3, 2.5, 0.2]);
  block('plaster', [-1.95, 5.83, 4.1], [5.3, 0.34, 0.2]);
  for (const y of [1.6, 4.6]) {
    for (const x of [-4.57, -1.95, 0.67]) block('trim', [x, y, 4.03], [0.055, 2.15, 0.07]);
    for (const yy of [y - 1.08, y + 1.08]) block('trim', [-1.95, yy, 4.03], [5.3, 0.055, 0.07]);
  }
  const door = new THREE.Group();
  door.position.set(3.15, 0, 4.05);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.4, 0.075), materials.blue);
  leaf.position.set(0.575, 1.2, 0);
  leaf.castShadow = true;
  door.add(leaf);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.32, 0.06), materials.metal);
  handle.position.set(1.03, 1.25, 0.07);
  door.add(handle);
  group.add(door);
  block('trim', [3.75, 2.52, 4.1], [1.32, 0.08, 0.3]);
  for (const x of [3.11, 4.37]) block('trim', [x, 1.25, 4.1], [0.08, 2.5, 0.3]);
  for (let i = 0; i < 6; i++) block('stone', [3.75, -0.07, 4.6 + i * 0.72], [1.4, 0.14, 0.62]);
  block('stone', [-1.2, -0.04, 5.0], [7.6, 0.2, 1.4]);
  for (let i = 0; i < 17; i++)
    add(
      facet,
      i % 3 ? 'leaf' : 'leafLight',
      [-4.7 + i * 0.42, 0.23 + (i % 3) * 0.11, 5.0 + (i % 2) * 0.2],
      [0.48, 0.43, 0.46],
    );
  for (const [x, z] of [
    [-7, -3],
    [-7.2, 2.7],
    [7.4, -2.8],
    [-6, 7.5],
  ]) {
    add(cylinder, 'oakDark', [x, 1.5, z], [0.12, 3, 0.12]);
    for (let i = 0; i < 5; i++)
      add(
        facet,
        i % 2 ? 'leafLight' : 'leaf',
        [x + Math.sin(i * 2) * 0.65, 2.8 + (i % 3) * 0.55, z + Math.cos(i * 2) * 0.6],
        [1.0, 1.15, 1.0],
      );
  }
  plant(4.65, 0.02, 4.6, 1.3);
  // An unobtrusive distant sky, rather than a flat black void outside windows.
  for (let i = 0; i < 10; i++) block('ceramic', [-14 + i * 3, 1.5 + (i % 4) * 0.4, -12], [2.4, 3 + (i % 4) * 0.8, 2.1]);

  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return { group, door };
}
