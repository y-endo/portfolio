import * as THREE from 'three';

/** The lawn's surface, a quarter of a metre below the ground floor. */
const LAWN_Y = -0.25;
/** The garden, edged by a clipped hedge at the back, the sides and the west end of the front. */
const PLOT = { west: -11, east: 11, back: -11, front: 12 };
/**
 * The front is open east of the car, so the closing shot, taken from the road at eye level, looks over the lawn
 * to the door rather than over a hedge filling the bottom of the frame.
 */
const FRONT_HEDGE_END = -5.5;
/** Where the opening camera sweeps round the west of the garden; trees there would fill the lens. */
const OPENING_PATH = [
  [-13, 7],
  [-11, 2],
  [-8.5, -0.75],
] as const;

/**
 * The height of the land: flat lawn round the house, rising past 24 m into low hills that the fog turns pale,
 * so the horizon reads as distance rather than the edge of a board.
 */
function groundHeight(x: number, z: number) {
  const distance = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const ridges =
    3.2 + 1.8 * Math.sin(angle * 3 + 1.3) + 1.2 * Math.sin(angle * 5 - 0.7) + 0.8 * Math.sin(x * 0.23 + z * 0.11);
  return LAWN_Y + THREE.MathUtils.smoothstep(distance, 24, 50) * Math.max(0.4, ridges) * 1.6;
}

/** The same scatter on every visit, so the scenery never shifts between loads. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(140, 140, 56, 56).rotateX(-Math.PI / 2).toNonIndexed();
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) position.setY(i, groundHeight(position.getX(i), position.getZ(i)));
  // Each facet takes its own shade of green, faint on the lawn and stronger on the hills, for a low-poly field.
  const random = seededRandom(7);
  const lawn = new THREE.Color(0x8faa66);
  const hill = new THREE.Color(0x7b9660);
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  for (let face = 0; face < position.count; face += 3) {
    const x = (position.getX(face) + position.getX(face + 1) + position.getX(face + 2)) / 3;
    const z = (position.getZ(face) + position.getZ(face + 1) + position.getZ(face + 2)) / 3;
    const farness = THREE.MathUtils.smoothstep(Math.hypot(x, z), 18, 40);
    color.copy(lawn).lerp(hill, farness);
    color.offsetHSL(0, 0, (random() - 0.5) * (0.025 + farness * 0.05));
    for (let corner = 0; corner < 3; corner++) color.toArray(colors, (face + corner) * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
  );
  terrain.receiveShadow = true;
  return terrain;
}

/** Collects the transforms of one shape in one colour, drawn later as a single instanced mesh. */
function createBatch(geometry: THREE.BufferGeometry, color: number) {
  const matrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  return {
    add(position: THREE.Vector3Tuple, scale: THREE.Vector3Tuple, rotationY = 0) {
      dummy.position.set(...position);
      dummy.scale.set(...scale);
      dummy.rotation.set(0, rotationY, 0);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    },
    build(castShadow = false) {
      const mesh = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }),
        matrices.length,
      );
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.castShadow = castShadow;
      mesh.receiveShadow = castShadow;
      return mesh;
    },
  };
}

/** Lawn, hedge, the neighbours' houses and trees round about, and hills in the distance. */
export function createLandscape() {
  const group = new THREE.Group();
  group.name = 'Landscape';
  group.add(createTerrain());
  const random = seededRandom(19);
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

  // The hedge is laid in 2 m lengths of slightly different height and depth, like a hand-clipped row.
  const hedge = createBatch(box, 0x5b7a47);
  const hedgeRun = (fromX: number, fromZ: number, toX: number, toZ: number) => {
    const length = Math.hypot(toX - fromX, toZ - fromZ);
    const count = Math.max(1, Math.round(length / 2));
    const rotationY = Math.atan2(toX - fromX, toZ - fromZ);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      hedge.add(
        [THREE.MathUtils.lerp(fromX, toX, t), LAWN_Y, THREE.MathUtils.lerp(fromZ, toZ, t)],
        [0.62 + random() * 0.1, 0.85 + random() * 0.15, length / count + 0.02],
        rotationY,
      );
    }
  };
  hedgeRun(PLOT.west, PLOT.back, PLOT.east, PLOT.back);
  hedgeRun(PLOT.west, PLOT.back, PLOT.west, PLOT.front);
  hedgeRun(PLOT.east, PLOT.back, PLOT.east, PLOT.front);
  hedgeRun(PLOT.west, PLOT.front, FRONT_HEDGE_END, PLOT.front);
  group.add(hedge.build(true));

  // Neighbouring houses stand behind and beside the garden, far enough that the fog softens them.
  const walls = [createBatch(box, 0xeeebe3), createBatch(box, 0xdcd8cf), createBatch(box, 0xe4e6e2)];
  const roofShape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
  const roofs = [
    createBatch(roofGeometry, 0x55606a),
    createBatch(roofGeometry, 0x6b5d53),
    createBatch(roofGeometry, 0x4b535c),
  ];
  const neighbours: [number, number, number][] = [
    [-24, -20, 0.3],
    [-8, -29, -0.1],
    [9, -27, 0.15],
    [25, -17, -0.35],
    [30, 2, 1.4],
    [-30, -2, 1.7],
    [-19, -36, 0.5],
    [21, -38, -0.2],
  ];
  neighbours.forEach(([x, z, rotationY], index) => {
    const width = 6 + random() * 3;
    const depth = 6 + random() * 2.5;
    const height = 4.6 + random() * 1.6;
    const base = groundHeight(x, z) - 0.3;
    walls[index % walls.length].add([x, base, z], [width, height, depth], rotationY);
    roofs[index % roofs.length].add([x, base + height, z], [width + 0.7, 1.8 + random() * 0.6, depth + 0.7], rotationY);
  });
  for (const batch of [...walls, ...roofs]) group.add(batch.build());

  // Trees round about, kept out of the garden and of the view from the front where the opening begins.
  const trunk = createBatch(new THREE.CylinderGeometry(0.5, 0.6, 1, 6).translate(0, 0.5, 0), 0x7a6250);
  const crowns = [
    createBatch(new THREE.IcosahedronGeometry(1, 0), 0x6b8a52),
    createBatch(new THREE.IcosahedronGeometry(1, 0), 0x55753f),
  ];
  const spires = createBatch(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), 0x4a6a43);
  let planted = 0;
  while (planted < 60) {
    const angle = random() * Math.PI * 2;
    const distance = 15 + random() * 33;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const isNearPlot = x > PLOT.west - 3 && x < PLOT.east + 3 && z > PLOT.back - 3;
    const isNearNeighbour = neighbours.some(([nx, nz]) => Math.hypot(x - nx, z - nz) < 6.5);
    const isOnOpeningPath = OPENING_PATH.some(([px, pz]) => Math.hypot(x - px, z - pz) < 8);
    if (isNearPlot || z > 10 || isNearNeighbour || isOnOpeningPath) continue;
    planted++;
    const base = groundHeight(x, z) - 0.1;
    const size = 0.8 + random() * 0.7;
    trunk.add([x, base, z], [0.18 * size, 1.6 * size, 0.18 * size]);
    if (random() < 0.35) {
      spires.add([x, base + 1.2 * size, z], [1.3 * size, 4.2 * size, 1.3 * size], random() * Math.PI);
    } else {
      crowns[planted % 2].add([x, base + 2.6 * size, z], [1.9 * size, 1.7 * size, 1.9 * size], random() * Math.PI);
    }
  }
  for (const batch of [trunk, spires, ...crowns]) group.add(batch.build());
  return group;
}
