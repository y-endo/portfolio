import * as THREE from 'three';
import { createLandscape } from './house-landscape.ts';

type Triple = [number, number, number];

/** A tumbler for the kitchen break. Its origin is the centre of the grip. */
export function createGlass() {
  const glass = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.032, 0.11, 10, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xb9ccd6,
      roughness: 0.45,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  // A generous amber drink keeps the glass readable against the white kitchen walls.
  const drink = new THREE.Mesh(
    new THREE.CylinderGeometry(0.031, 0.029, 0.07, 10),
    new THREE.MeshStandardMaterial({ color: 0xb8651c, roughness: 0.3 }),
  );
  drink.position.y = -0.015;
  glass.add(wall, drink);
  return glass;
}

/** Low-poly furniture downloaded as GLB files. Each faces +Z with its origin at the centre of its bounds. */
export const PROP_MODELS = {
  plant: '/assets/models/props/bookshop-floor-plant.glb',
  monitor: '/assets/models/props/monitor.glb',
  keyboard: '/assets/models/props/keyboard.glb',
  bookcase: '/assets/models/props/tall-bookcase.glb',
  bookStack: '/assets/models/props/bookshop-book-stack.glb',
  coffeeMug: '/assets/models/props/coffee-mug.glb',
  sofa: '/assets/models/props/sofa-3seat.glb',
  wallArt: '/assets/models/props/dining-wall-art.glb',
  rug: '/assets/models/props/dining-area-rug.glb',
  tallCabinet: '/assets/models/props/tall-cabinet.glb',
  wineRack: '/assets/models/props/wine-rack.glb',
  sideboard: '/assets/models/props/dining-sideboard.glb',
  wallShelves: '/assets/models/props/office-wall-shelves.glb',
  television: '/assets/models/props/tv-flatscreen.glb',
  bench: '/assets/models/props/bench-01.glb',
  car: '/assets/models/props/family-sedan.glb',
  cypress: '/assets/models/props/cypress-tree.glb',
  oak: '/assets/models/props/tree-oak-01.glb',
  clouds: '/assets/models/props/cloud-set-01.glb',
} as const;

export type PropPlacement = {
  model: keyof typeof PROP_MODELS;
  position: Triple;
  rotationY?: number;
  /** One number scales evenly; three numbers scale x, y and z, e.g. to keep a rug thin. */
  scale?: number | Triple;
  /** Far-off props such as clouds ignore the fog and cast no shadow. */
  isSky?: boolean;
};

/** The house uses metres. Ground = 0, upper floor = 3, front = +Z. */
/** Inner face of the front facade; the wall itself runs to z = 5.4. */
const FRONT = 5.2;
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
    blue: 0x304df0,
    sash: 0x5d6468,
    curtain: 0xc7b597,
    walnut: 0x6b4e36,
    black: 0x1d1f22,
    appliance: 0xecedea,
    roof: 0x55606a,
    foundation: 0xbdbab2,
    leaf: 0x64814c,
    leafLight: 0xa5b975,
    leafDark: 0x415e3a,
    soil: 0x766452,
    ceramic: 0xe4dfd2,
    stone: 0xd1cec3,
    paper: 0xf7f3e7,
  };
  type ColorName = keyof typeof palette;
  // Metal and the fridge's doors have a soft sheen; the roof is coated sheet metal. Everything else is matt.
  const roughness: Record<string, number> = { metal: 0.45, appliance: 0.35, roof: 0.7 };
  const materials = Object.fromEntries(
    Object.entries(palette).map(([name, color]) => [
      name,
      new THREE.MeshStandardMaterial({ color, roughness: roughness[name] ?? 0.86, flatShading: true }),
    ]),
  ) as Record<ColorName, THREE.MeshStandardMaterial>;
  // Plastered walls and ceilings get faint, broad clouding, as a trowelled finish has, so they do not read as one
  // flat grey. It is worked out from the position in the house, so it runs on across the blocks a wall is built
  // from. It is kept broad and within about 2% of the colour: fine grain would shimmer at a distance.
  materials.plaster.customProgramCacheKey = () => 'plaster-clouding';
  materials.plaster.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPlasterPosition;')
      .replace(
        '#include <project_vertex>',
        [
          '#include <project_vertex>',
          'vec4 plasterPosition = vec4(transformed, 1.0);',
          '#ifdef USE_INSTANCING',
          'plasterPosition = instanceMatrix * plasterPosition;',
          '#endif',
          'vPlasterPosition = (modelMatrix * plasterPosition).xyz;',
        ].join('\n'),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'varying vec3 vPlasterPosition;',
          'float plasterHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }',
          'float plasterNoise(vec3 p) {',
          '  vec3 i = floor(p);',
          '  vec3 f = p - i;',
          '  f = f * f * (3.0 - 2.0 * f);',
          '  return mix(',
          '    mix(mix(plasterHash(i), plasterHash(i + vec3(1, 0, 0)), f.x),',
          '        mix(plasterHash(i + vec3(0, 1, 0)), plasterHash(i + vec3(1, 1, 0)), f.x), f.y),',
          '    mix(mix(plasterHash(i + vec3(0, 0, 1)), plasterHash(i + vec3(1, 0, 1)), f.x),',
          '        mix(plasterHash(i + vec3(0, 1, 1)), plasterHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);',
          '}',
        ].join('\n'),
      )
      .replace(
        '#include <color_fragment>',
        [
          '#include <color_fragment>',
          'float clouding = plasterNoise(vPlasterPosition * 1.4) * 0.65 + plasterNoise(vPlasterPosition * 3.7) * 0.35;',
          'diffuseColor.rgb *= 1.0 + (clouding - 0.5) * 0.045;',
        ].join('\n'),
      );
  };
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
    for (const name of ['oak', 'oakLight', 'oakDark', 'walnut'] as const) materials[name].map = grain;
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
    target?: THREE.Group,
  ) => {
    // Furniture that moves is built from ordinary meshes inside its own group instead of the batches.
    if (target) {
      const mesh = new THREE.Mesh(shape, materials[color]);
      mesh.position.set(...position);
      mesh.scale.set(...size);
      mesh.rotation.set(...rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      target.add(mesh);
      return;
    }
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
  const block = (
    color: ColorName,
    position: Triple,
    size: Triple,
    rotation: Triple = [0, 0, 0],
    target?: THREE.Group,
  ) => add(box, color, position, size, rotation, target);
  const beam = (color: ColorName, start: Triple, end: Triple, width: number, target?: THREE.Group) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    const euler = new THREE.Euler().setFromQuaternion(dummy.quaternion);
    block(
      color,
      a.add(b).multiplyScalar(0.5).toArray() as Triple,
      [width, new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end)), width],
      [euler.x, euler.y, euler.z],
      target,
    );
  };
  const props: PropPlacement[] = [];
  /** The plant model is 1.43 m tall; size 1 gives the 0.95 m of the earlier hand-made plant. */
  const plant = (x: number, y: number, z: number, size = 1) => {
    const scale = 0.666 * size;
    props.push({ model: 'plant', position: [x, y + 0.7133 * scale, z], rotationY: x * 2.3 + z * 1.7, scale });
  };
  /** Planes facing +X whose texture the browser fills in. Unlit so the picture keeps its colours. */
  const screen = (position: Triple, [width, height]: [number, number]) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: palette.screen, toneMapped: false }),
    );
    mesh.position.set(...position);
    mesh.rotation.y = Math.PI / 2;
    group.add(mesh);
    return mesh;
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

  // Faintly tinted, reflective glass: the sash and the reflections of the sky and the room show it is glass.
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xbcd9e2,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.PlaneGeometry(1, 1);
  const glassPane = (target: THREE.Group, position: Triple, size: [number, number]) => {
    const glass = new THREE.Mesh(plane, glassMaterial);
    glass.position.set(...position);
    glass.scale.set(...size, 1);
    target.add(glass);
  };
  type WindowPlacement = {
    /** Centre of the wall opening. */
    position: Triple;
    /** Turns the window's indoor side (+Z) to face the room: 0 on the back wall, π/2 on the west, π on the front, -π/2 on the east. */
    rotationY: number;
    size: [number, number];
    /** Curtains drawn open at the window's left (-1) and right (+1) ends, hanging to the floor at floorY. */
    curtains?: { sides: (-1 | 1)[]; floorY: number };
    /** A wooden venetian blind, drawn up into a stack under the head of the opening. */
    hasBlind?: boolean;
  };
  /** A sliding window: a slim sash frame around two glazed panes on separate tracks. */
  const glazedWindow = ({ position, rotationY, size: [width, height], curtains, hasBlind }: WindowPlacement) => {
    const unit = new THREE.Group();
    unit.position.set(...position);
    unit.rotation.y = rotationY;
    group.add(unit);
    const frame = 0.05;
    for (const side of [-1, 1]) {
      block('sash', [0, side * (height / 2 - frame / 2), 0], [width, frame, 0.12], [0, 0, 0], unit);
      block('sash', [side * (width / 2 - frame / 2), 0, 0], [frame, height, 0.12], [0, 0, 0], unit);
    }
    const inner = width / 2 - frame;
    const paneWidth = inner + 0.01;
    const paneHeight = height - frame * 2;
    const stile = 0.035;
    for (const side of [-1, 1]) {
      const x = (side * (inner - 0.01)) / 2;
      const z = side * 0.022;
      for (const edge of [-1, 1]) {
        block('sash', [x, edge * (paneHeight / 2 - stile / 2), z], [paneWidth, stile, 0.03], [0, 0, 0], unit);
        block('sash', [x + edge * (paneWidth / 2 - stile / 2), 0, z], [stile, paneHeight, 0.03], [0, 0, 0], unit);
      }
      glassPane(unit, [x, 0, z], [paneWidth - stile * 2, paneHeight - stile * 2]);
    }
    if (hasBlind) {
      // Head rail, eight slats stacked tight beneath it, the bottom rail, and three ladder tapes over the stack.
      const head = height / 2 - 0.03;
      block('oak', [0, head, 0.14], [width - 0.04, 0.05, 0.07], [0, 0, 0], unit);
      for (let i = 0; i < 8; i++) {
        block('oakLight', [0, head - 0.035 - i * 0.012, 0.14], [width - 0.08, 0.008, 0.06], [0, 0, 0], unit);
      }
      const bottomRail = head - 0.035 - 8 * 0.012 - 0.006;
      block('oak', [0, bottomRail, 0.14], [width - 0.06, 0.02, 0.065], [0, 0, 0], unit);
      for (const x of [-(width / 2 - 0.25), 0, width / 2 - 0.25]) {
        block('cloth', [x, (head + bottomRail) / 2, 0.14], [0.02, head - bottomRail, 0.068], [0, 0, 0], unit);
      }
    }
    if (!curtains) return;
    // The rail hangs just under the opening's head, in front of any sill; each curtain is a zigzag of pleats.
    const top = height / 2 - 0.04;
    const bottom = curtains.floorY + 0.02 - position[1];
    block('metal', [0, top, 0.3], [width + 0.1, 0.025, 0.025], [0, 0, 0], unit);
    for (const side of curtains.sides) {
      for (let i = 0; i < 10; i++) {
        const x = side * (width / 2 - 0.06 - i * 0.05);
        block('curtain', [x, (top + bottom) / 2, 0.3], [0.07, top - bottom, 0.012], [0, i % 2 ? 0.8 : -0.8, 0], unit);
      }
    }
  };

  // A continuous floor plan, with a real void above the staircase and living room.
  // The ground floor reaches 1.2 m past the upper floor's front, leaving a roomy hall at the foot of the stairs.
  floor(-5, 5, -4, FRONT, 0);
  floor(-5, 0.8, -4, -0.3, 3);
  floor(0.8, 5, -4, -1.3, 3);
  floor(0.8, 2.9, -1.3, -0.3, 3);
  block('plaster', [0, 1.5, -4.1], [10.4, 3, 0.2]);
  block('plaster', [-1.5, 4.5, -4.1], [7, 3, 0.2]);
  block('plaster', [4.85, 4.5, -4.1], [0.7, 3, 0.2]);
  block('plaster', [3.25, 4.5, -4.1], [2.5, 3, 0.2]);
  // Shelves (0.72 x 0.67 x 0.21 m, shown at 1.4x) on the hall's back wall, beside the stairs.
  props.push({ model: 'wallShelves', position: [3.25, 4.65, -4.0 + 0.103 * 1.4], scale: 1.4 });
  // East wall, with a window over the upstairs hall beside the top of the stairs (z -2.9 to -1.5, y 3.9 to 5.4).
  block('plaster', [5.1, 1.95, 0.6], [0.2, 3.9, 9.6]);
  block('plaster', [5.1, 5.75, 0.6], [0.2, 0.7, 9.6]);
  block('plaster', [5.1, 4.65, -3.55], [0.2, 1.5, 1.3]);
  block('plaster', [5.1, 4.65, 1.95], [0.2, 1.5, 6.9]);
  block('trim', [5.0, 3.875, -2.2], [0.32, 0.08, 1.4]);
  glazedWindow({ position: [5.1, 4.65, -2.2], rotationY: -Math.PI / 2, size: [1.4, 1.5], hasBlind: true });
  block('trim', [0, 6.1, 0.6], [10.5, 0.2, 9.7]);
  // A low gable roof of coated sheet metal over the flat ceiling. The ridge runs east to west above the middle of
  // the house (z = 0.6, walls from z -4.2 to 5.4) and the eaves reach 0.45 m past the walls.
  const pitch = THREE.MathUtils.degToRad(18);
  const halfDepth = 4.8;
  const eave = 0.45;
  const rise = halfDepth * Math.tan(pitch);
  const roofThickness = 0.12;
  for (const side of [-1, 1]) {
    const run = halfDepth + eave;
    const middleY = 6.2 + (rise - eave * Math.tan(pitch)) / 2 + (roofThickness / 2) * Math.cos(pitch);
    const middleZ = 0.6 + (side * run) / 2 + side * (roofThickness / 2) * Math.sin(pitch);
    block('roof', [0, middleY, middleZ], [11.2, roofThickness, run / Math.cos(pitch)], [side * pitch, 0, 0]);
  }
  block('roof', [0, 6.2 + rise + 0.1, 0.6], [11.3, 0.07, 0.34]);
  // Triangular gable walls close the roof at the east and west ends.
  const gableShape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const gable = new THREE.ExtrudeGeometry(gableShape, { depth: 1, bevelEnabled: false })
    .rotateY(Math.PI / 2)
    .translate(-0.5, 0, 0);
  for (const x of [-5.1, 5.1]) add(gable, 'plaster', [x, 6.2, 0.6], [0.2, rise, 9.6]);
  // A concrete foundation band under the walls hides the edge of the ground floor's slab from outside. It stands
  // 1 cm proud of the walls, and the side and end bands overlap at the corners without sharing a face, since
  // faces in the same plane flicker.
  for (const x of [-5.1, 5.1]) block('foundation', [x, -0.135, 0.6], [0.22, 0.27, 9.6]);
  for (const z of [-4.1, 5.3]) block('foundation', [0, -0.135, z], [10.4, 0.27, 0.22]);
  // West wall: two large windows upstairs. Downstairs, a high strip window by the kitchen and a solid wall
  // behind the television.
  for (const level of [0, 3]) {
    block('plaster', [-5.1, level + 0.28, 0.65], [0.2, 0.56, 9.5]);
    block('plaster', [-5.1, level + 2.88, 0.65], [0.2, 0.24, 9.5]);
    for (const z of [-3.92, -0.35]) block('plaster', [-5.1, level + 1.65, z], [0.2, 2.3, 0.22]);
    // Solid wall between the front window and the moved-forward facade.
    block('plaster', [-5.1, level + 1.65, 4.44], [0.2, 2.3, 1.93]);
  }
  for (const [z, width] of [
    [-2.135, 3.35],
    [1.6175, 3.715],
  ]) {
    block('trim', [-5.0, 3.555, z], [0.32, 0.08, width]);
    glazedWindow({ position: [-5.1, 4.66, z], rotationY: Math.PI / 2, size: [width, 2.2], hasBlind: true });
  }
  block('plaster', [-5.1, 1.66, 1.6175], [0.2, 2.2, 3.715]);
  // The kitchen strip window spans z -3.3 to -0.9 and y 1.8 to 2.45.
  block('plaster', [-5.1, 1.18, -2.135], [0.2, 1.24, 3.35]);
  block('plaster', [-5.1, 2.605, -2.135], [0.2, 0.31, 3.35]);
  block('plaster', [-5.1, 2.125, -3.555], [0.2, 0.65, 0.51]);
  block('plaster', [-5.1, 2.125, -0.68], [0.2, 0.65, 0.44]);
  // The sill's top sits just below the wall's, so the two faces never share a plane and flicker.
  block('trim', [-4.97, 1.775, -2.1], [0.26, 0.04, 2.4]);
  glazedWindow({ position: [-5.1, 2.125, -2.1], rotationY: Math.PI / 2, size: [2.4, 0.65] });
  // Wooden skirting boards, a shade darker than the oak floor, run round the rooms where the walls meet the floor.
  // They stop at the doorways and along the edges of the void over the living room. Each is 8 cm high and stands
  // 12 mm proud of its wall.
  const skirting = (axis: 'x' | 'z', at: number, from: number, to: number, floorY: number) => {
    const middle = (from + to) / 2;
    const length = to - from;
    if (axis === 'x') block('oakDark', [middle, floorY + 0.045, at], [length, 0.08, 0.012]);
    else block('oakDark', [at, floorY + 0.045, middle], [0.012, 0.08, length]);
  };
  // Ground floor: the back, east and west walls, and the front wall either side of the door frame.
  skirting('x', -3.994, -5, 5, 0);
  skirting('z', 4.994, -4, 5.2, 0);
  skirting('z', -4.994, -4, 5.2, 0);
  skirting('x', 5.194, -5, 0.57, 0);
  skirting('x', 5.194, 1.91, 5, 0);
  // Upper floor: the back wall, the west wall of the study and the hall's east wall, and both faces of the study
  // wall either side of its door.
  skirting('x', -3.994, -5, 5, 3);
  skirting('z', -4.994, -4, -0.3, 3);
  skirting('z', 4.994, -4, -1.3, 3);
  for (const face of [0.729, 0.871]) {
    skirting('z', face, -4, -2.665, 3);
    skirting('z', face, -1.535, -0.3, 3);
  }
  // Study wall and an open door leading onto the landing.
  block('plaster', [0.8, 4.5, -3.3], [0.13, 3, 1.4]);
  block('plaster', [0.8, 4.5, -0.93], [0.13, 3, 1.25]);
  block('plaster', [0.8, 5.72, -2.1], [0.13, 0.56, 1.05]);
  for (const z of [-2.63, -1.57]) block('oakLight', [0.79, 4.22, z], [0.19, 2.45, 0.065]);
  block('oakLight', [0.79, 5.43, -2.1], [0.19, 0.07, 1.1]);
  block('oak', [0.28, 4.2, -1.59], [1.0, 2.38, 0.055]);
  block('metal', [-0.13, 4.15, -1.53], [0.13, 0.035, 0.04]);
  // Landing balusters and sloping stair rails, joined the way a built staircase is: the landing guard turns the
  // corner at a newel post standing on the stairs, and the west stair rail runs down from that post instead of
  // running on beside the guard. Every rail end is taken by a newel; the stair rails slope at 0.625 (rise / run).
  const stairRailY = (z: number) => 1.16 + (3.36 - z) * 0.625;
  const newel = (x: number, z: number, bottom: number, top: number, size = 0.09) => {
    block('oak', [x, (bottom + top) / 2, z], [size, top - bottom, size]);
    block('oakDark', [x, top + 0.015, z], [size + 0.03, 0.03, size + 0.03]);
  };
  for (let x = -4.9; x < 2.9; x += 0.22) block('trim', [x, 3.48, -0.28], [0.025, 0.94, 0.025]);
  beam('oak', [-5, 3.98, -0.28], [2.9, 3.98, -0.28], 0.06);
  for (let i = 0; i < 15; i++) {
    const z = 3.36 - i * 0.32;
    const height = (i + 1) * 0.2;
    block('plaster', [3.62, height / 2 - 0.01, z], [1.25, height, 0.32]);
    block('oakLight', [3.62, height, z], [1.31, 0.035, 0.335]);
    block('trim', [4.28, height + 0.47, z], [0.025, 0.94, 0.025]);
    // Above the corner post the landing guard already closes the west side.
    if (z > -0.28) block('trim', [2.96, height + 0.47, z], [0.025, 0.94, 0.025]);
  }
  for (let z = -1.22; z < -0.3; z += 0.22) block('trim', [2.91, 3.48, z], [0.025, 0.94, 0.025]);
  beam('oak', [2.91, 3.98, -1.3], [2.91, 3.98, -0.28], 0.06);
  // The corner post stands on the twelfth tread (top at 2.42) and takes the landing guards and the west stair rail.
  newel(2.935, -0.28, 2.42, 4.06, 0.11);
  newel(2.91, -1.3, 3.0, 4.06);
  beam('oak', [2.96, stairRailY(3.6), 3.6], [2.96, stairRailY(-0.28), -0.28], 0.065);
  beam('oak', [4.28, stairRailY(3.6), 3.6], [4.28, stairRailY(-1.2), -1.2], 0.065);
  newel(4.28, -1.2, 3.02, 4.06);
  // Posts at the foot of the stairs, on the hall floor.
  for (const x of [2.96, 4.28]) newel(x, 3.6, 0, 1.2);
  // A framed portrait beside the landing rail, where the profile chapter stops.
  block('oakDark', [0.885, 4.25, -0.93], [0.04, 0.74, 0.6]);
  const picture = screen([0.907, 4.25, -0.93], [0.5, 0.625]);

  // Study workstation: its dimensions match the supplied Typing clip. The person faces -X at the desk.
  const deskTop = 3.6885;
  block('oakLight', [-3.515, 3.671, -2.1], [0.72, 0.035, 1.6]);
  for (const x of [-3.8, -3.25]) for (const z of [-2.77, -1.43]) block('oak', [x, 3.33, z], [0.055, 0.65, 0.055]);
  // The monitor model's screen is 0.572 x 0.317 m, 0.0945 m in front of its centre and 0.134 m above it.
  props.push({ model: 'monitor', position: [-3.73, deskTop + 0.3063, -2.1], rotationY: Math.PI / 2 });
  const monitorScreen = screen([-3.633, deskTop + 0.3063 + 0.1338, -2.1], [0.572, 0.317]);
  // The keys sit 0.082 m in front of the keyboard model's centre; the cable runs back under the monitor.
  props.push({ model: 'keyboard', position: [-3.532, deskTop + 0.023, -2.1], rotationY: Math.PI / 2 });
  props.push({ model: 'bookStack', position: [-3.66, deskTop + 0.1028, -1.6], rotationY: 0.35 });
  props.push({ model: 'coffeeMug', position: [-3.36, deskTop + 0.09, -1.82], rotationY: 0.6 });
  // The desk chair rolls back when the person stands up, so it keeps its own group.
  const chair = new THREE.Group();
  chair.position.set(-3, 0, -2.1);
  group.add(chair);
  block('cloth', [0, 3.36, 0], [0.42, 0.07, 0.46], [0, 0, 0], chair);
  block('cloth', [0.23, 3.67, 0], [0.08, 0.55, 0.46], [0, 0, -0.13], chair);
  add(cylinder, 'metal', [0, 3.19, 0], [0.028, 0.32, 0.028], [0, 0, 0], chair);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 0.4;
    const x = Math.sin(a) * 0.28;
    const z = Math.cos(a) * 0.28;
    beam('metal', [0, 3.1, 0], [x, 3.07, z], 0.025, chair);
    add(cylinder, 'metal', [x, 3.055, z], [0.04, 0.05, 0.04], [Math.PI / 2, 0, 0], chair);
  }
  props.push({ model: 'bookcase', position: [-2.2, 3.01 + 1.139, -3.787] });
  plant(-4.65, 3.02, -3.42, 1.35);
  // Two framed prints on the hall's back wall, just outside the study door.
  props.push({ model: 'wallArt', position: [1.4, 4.6, -3.98], scale: 1.2 });

  // A black ceiling fan hangs from the double-height ceiling over the living room on a 1 m downrod, as fans in
  // tall rooms do; at that height it shows through the upper front windows from the garden. Its blades are a
  // group of their own, which the runtime turns slowly.
  const fan = new THREE.Group();
  fan.position.set(-2.4, 0, 3.4);
  group.add(fan);
  add(cylinder, 'black', [0, 5.97, 0], [0.09, 0.06, 0.09], [0, 0, 0], fan);
  add(cylinder, 'black', [0, 5.46, 0], [0.018, 1.0, 0.018], [0, 0, 0], fan);
  add(cylinder, 'black', [0, 4.93, 0], [0.15, 0.14, 0.15], [0, 0, 0], fan);
  const fanBlades = new THREE.Group();
  fanBlades.position.set(0, 4.9, 0);
  fan.add(fanBlades);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const blade = new THREE.Group();
    blade.rotation.y = angle;
    fanBlades.add(blade);
    block('black', [0.18, 0, 0], [0.12, 0.02, 0.04], [0, 0, 0], blade);
    // A slight pitch, as real blades have.
    block('black', [0.52, 0, 0], [0.62, 0.012, 0.13], [0.12, 0, 0], blade);
  }

  // Living room, with a sofa facing the television on the west wall, 0.9 m clear of the island's stools.
  props.push({ model: 'rug', position: [-2.2, 0.025, 2.25], scale: [1.7, 1, 1.7] });
  // The sofa model's cushions sit 0.54 m up. Only its height is scaled, to 0.72, so the cushion top lands at
  // 0.398 m, where the SitIdle thighs rest (0.377 m above the root at 0.02). Its seat front is 0.323 m ahead
  // of the model's centre, at x = -1.40: the seated knees reach a little past it, and the standing calves
  // (0.1 m behind the root at x = -1.55) stay clear of it while the person stands up.
  props.push({
    model: 'sofa',
    position: [-1.077, 0.009 + 0.38 * 0.72, 2.3],
    rotationY: -Math.PI / 2,
    scale: [1.1, 0.72, 1],
  });
  block('oak', [-2.8, 0.39, 2.1], [1.0, 0.065, 1.65]);
  for (const x of [-3.15, -2.45]) for (const z of [1.45, 2.75]) block('oakDark', [x, 0.2, z], [0.05, 0.36, 0.05]);
  block('paper', [-2.8, 0.44, 2.45], [0.44, 0.035, 0.3], [0, 0.18, 0]);
  // A deeper cabinet holds the television's 0.6 m stand.
  block('oak', [-4.6, 0.3, 2.1], [0.8, 0.55, 2.3]);
  // The television stands on the cabinet at 1.5x. Its screen is 1.77 x 0.99 m, 0.15 m above the model's centre
  // and, set back almost flush with the bezel (prepare-props.py), 0.0405 m in front of it; the works are drawn on
  // a plane laid 1.5 mm over it.
  props.push({ model: 'television', position: [-4.6, 0.575 + 0.69, 2.1], rotationY: Math.PI / 2, scale: 1.5 });
  const tvScreen = screen([-4.558, 1.415, 2.1], [1.77, 0.99]);
  plant(-4.45, 0.02, 4.55, 1.7);

  // Oak kitchen and island. The walk route passes around the island's east end.
  for (let x = -4.4; x < 1.8; x += 0.82) {
    block('oak', [x, 0.43, -3.62], [0.79, 0.84, 0.65]);
    block('oakDark', [x + 0.25, 0.74, -3.285], [0.15, 0.018, 0.02]);
    block('trim', [x, 2.1, -3.77], [0.79, 0.8, 0.4]);
  }
  block('ceramic', [-1.5575, 0.89, -3.62], [6.635, 0.06, 0.76]);
  block('metal', [-2.75, 0.928, -3.56], [0.63, 0.015, 0.44]);
  block('cloth', [-2.75, 0.935, -3.56], [0.52, 0.012, 0.32]);
  beam('metal', [-2.75, 0.94, -3.83], [-2.75, 1.22, -3.83], 0.025);
  beam('metal', [-2.75, 1.22, -3.83], [-2.75, 1.22, -3.61], 0.025);
  block('metal', [-0.65, 0.928, -3.6], [0.85, 0.018, 0.47]);
  for (let i = 0; i < 4; i++)
    add(cylinder, 'cloth', [-0.88 + (i % 2) * 0.44, 0.941, -3.73 + Math.floor(i / 2) * 0.26], [0.095, 0.006, 0.095]);
  // A Japanese two-door fridge: a tall chilled compartment above a freezer drawer, pearl-white doors with a fine
  // dark seam between them, slim handles and a recessed plinth.
  block('appliance', [2.14, 0.92, -3.64], [0.72, 1.82, 0.62]);
  block('appliance', [2.14, 1.28, -3.31], [0.72, 1.08, 0.04]);
  block('appliance', [2.14, 0.385, -3.31], [0.72, 0.69, 0.04]);
  block('metal', [2.14, 0.735, -3.315], [0.72, 0.012, 0.035]);
  block('metal', [2.47, 1.2, -3.275], [0.018, 0.42, 0.022]);
  block('metal', [2.14, 0.66, -3.275], [0.4, 0.018, 0.022]);
  block('metal', [2.14, 0.025, -3.36], [0.7, 0.04, 0.02]);
  // A pantry beside the fridge: a tall cabinet (0.59 x 1.93 x 0.46 m), a wine rack (0.58 x 1.0 x 0.34 m) and a
  // sideboard (1.43 x 0.85 x 0.5 m).
  props.push({ model: 'tallCabinet', position: [2.845, 0.01 + 0.965, -3.77] });
  props.push({ model: 'wineRack', position: [3.45, 0.01 + 0.502, -3.83] });
  // The sideboard is 1.43 m wide; narrowed to 1.2 m it fills the 1.26 m left up to the east wall.
  props.push({ model: 'sideboard', position: [4.37, 0.01 + 0.425, -3.75], scale: [0.84, 1, 1] });
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
  add(cylinder, 'ceramic', [-0.15, 1.04, -0.62], [0.055, 0.17, 0.055]);

  // Front facade, a wooden entrance and a small garden, all visible in the last scene.
  // The entrance sits west of the staircase, so the hall between the bottom step and the door stays open.
  for (const [x, width] of [
    [-4.8, 0.4],
    [3.45, 3.1],
  ])
    block('plaster', [x, 1.5, 5.3], [width, 3, 0.2]);
  block('plaster', [-1.95, 0.25, 5.3], [5.3, 0.5, 0.2]);
  block('plaster', [-1.95, 2.88, 5.3], [5.3, 0.24, 0.2]);
  // A 15 cm pier keeps the window clear of the door frame, and the wall over the door runs from the pier to the
  // wall beyond the door, so no slit of sky shows round the frame.
  block('plaster', [0.495, 1.63, 5.3], [0.15, 2.26, 0.2]);
  block('plaster', [1.16, 2.78, 5.3], [1.48, 0.44, 0.2]);
  block('plaster', [0, 3.25, 5.3], [10, 0.5, 0.2]);
  block('plaster', [-4.8, 4.75, 5.3], [0.4, 2.5, 0.2]);
  block('plaster', [2.85, 4.75, 5.3], [4.3, 2.5, 0.2]);
  block('plaster', [-1.95, 5.83, 5.3], [5.3, 0.34, 0.2]);
  // Downstairs, the window stops at the pier beside the door and has its curtains drawn to its two outer ends.
  for (const [x, side] of [
    [-3.345, 1],
    [-0.835, -1],
  ] as const) {
    glazedWindow({
      position: [x, 1.63, 5.3],
      rotationY: Math.PI,
      size: [2.51, 2.26],
      curtains: { sides: [side], floorY: 0 },
    });
  }
  for (const x of [-3.275, -0.625]) {
    glazedWindow({ position: [x, 4.58, 5.3], rotationY: Math.PI, size: [2.65, 2.16], hasBlind: true });
  }
  const door = new THREE.Group();
  door.position.set(0.65, 0, FRONT + 0.05);
  // A flush walnut door with a narrow frosted glass slit by the hinge and a long bar handle on both faces.
  // The leaf is built round the slit (x 0.16 to 0.26, y 0.35 to 2.05) so the glass is seen from both sides. It
  // stands 2.47 m tall, 1 cm under the frame's head.
  const frosted = new THREE.MeshStandardMaterial({
    color: 0xe4ebed,
    roughness: 0.3,
    transparent: true,
    opacity: 0.65,
    flatShading: true,
  });
  for (const [x, y, width, height] of [
    [0.08, 1.235, 0.16, 2.47],
    [0.705, 1.235, 0.89, 2.47],
    [0.21, 0.175, 0.1, 0.35],
    [0.21, 2.26, 0.1, 0.42],
  ]) {
    block('walnut', [x, y, 0], [width, height, 0.075], [0, 0, 0], door);
  }
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 0.02), frosted);
  slit.position.set(0.21, 1.2, 0);
  door.add(slit);
  for (const side of [-1, 1]) {
    block('metal', [1.0, 1.15, side * 0.085], [0.028, 1.2, 0.028], [0, 0, 0], door);
    for (const y of [0.65, 1.65]) block('metal', [1.0, y, side * 0.06], [0.02, 0.02, 0.05], [0, 0, 0], door);
  }
  group.add(door);
  block('trim', [1.24, 2.52, 5.3], [1.34, 0.08, 0.3]);
  for (const x of [0.61, 1.87]) block('trim', [x, 1.25, 5.3], [0.08, 2.5, 0.3]);
  // Outside the door: a paved landing level with the floor, two shallow steps of 0.083 m down to the lawn
  // (y = -0.25) and a paved path almost flush with the grass out to the hedge, without joints: fine joints
  // shimmer into dotted lines at the distance of the closing shot. The landing reaches past the contact stop at
  // z = 6.6, so the person stands on it to wave.
  block('stone', [1.25, -0.13, 6.1], [1.4, 0.26, 1.4]);
  for (let i = 0; i < 2; i++) {
    const top = -0.083 * (i + 1);
    block('stone', [1.25, (top - 0.26) / 2, 6.8 + 0.175 + i * 0.35], [1.4, top + 0.26, 0.35]);
  }
  block('stone', [1.25, -0.245, 7.5 + 2.25], [1.4, 0.02, 4.5]);
  // The sedan model is 3.1 m long; 1.5x gives an ordinary family car parked on the lawn along the facade.
  props.push({ model: 'car', position: [-2.4, -0.25 + 0.479 * 1.5, 6.95], rotationY: Math.PI / 2, scale: 1.5 });
  props.push({ model: 'bench', position: [3.6, -0.25 + 0.463, 5.92] });
  // Trees stand on the lawn (y = -0.25), clear of the opening camera's path past the west window.
  const tree = (model: 'cypress' | 'oak', x: number, z: number, scale: number) => {
    const halfHeight = model === 'cypress' ? 4.271 : 2.176;
    props.push({ model, position: [x, -0.25 + halfHeight * scale, z], rotationY: x * 1.3 + z, scale });
  };
  tree('cypress', 7.6, -2.6, 0.75);
  tree('oak', 7.9, 3.6, 1.2);
  tree('cypress', -8.8, 8.6, 0.55);
  tree('oak', -2.0, -8.2, 1.4);
  tree('cypress', 3.6, -8.6, 0.8);
  // A few clouds, mostly behind the house where the opening and closing shots look.
  for (const [x, y, z, scale, turn] of [
    [-28, 14, -32, 4.5, 0.3],
    [6, 16, -44, 5.5, -0.4],
    [32, 13, -27, 4, 1.1],
    [-44, 12, -4, 3.5, 2.0],
  ])
    props.push({ model: 'clouds', position: [x, y, z], rotationY: turn, scale, isSky: true });

  group.add(createLandscape());

  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return { group, door, chair, monitorScreen, tvScreen, picture, fanBlades, props };
}
