import * as THREE from 'three';
import type { ChapterId } from '../data/chapters';

type Triple = [number, number, number];

/** Which side of the screen the HTML panel uses while the camera holds on a stop. */
export type PanelSide = 'left' | 'right' | 'none';

export type HouseStop = {
  id: string;
  chapter: ChapterId;
  label: string;
  side: PanelSide;
  position: Triple;
  yaw: number;
  action: string;
  /** Clip progress to hold while the camera rests here. Omit for clips that play in real time. */
  hold?: number;
  camera: { position: Triple; target: Triple; fov: number };
  /** Centre of the year sign on the east wall, for the career stops. */
  sign?: Triple;
};

type CameraKey = { at: number; position: Triple; look?: Triple; fov?: number };
type Leg = { kind: 'walk'; points: Triple[] } | { kind: 'stairs'; from: number; to: number };
/** A clip scrubbed between two fractions of a transition. `clip` maps that range onto clip progress. */
type Scrub = { action: string; from: number; until: number; clip?: [number, number] };
type Transition = {
  legs: Leg[];
  /** Clips scrubbed in place before the first step, such as standing up. */
  depart?: Scrub[];
  /** How far the actor slides while departing, e.g. pushing the desk chair back. */
  slide?: Triple;
  /** Clips scrubbed in place after the last step, ending on the next stop's pose. */
  arrive?: Scrub[];
  /** Camera keys between the two stops. A key without `look` follows the actor, a little ahead of the head. */
  camera: CameraKey[];
  /** How far the camera eases back for a wide view while travelling indoors (default 1, 0 keeps the keys). */
  pullBack?: number;
};

/** The staircase has 15 risers of 0.20 m and treads of 0.32 m. c = 0 is the top tread, c = 15 the hall floor. */
const STAIR_COUNT = 15;
const stairPoint = (c: number): Triple => [3.62, 3.02 - c * 0.2, -1.12 + c * 0.32];
/** StairsDown covers two treads per cycle; clip progress 0 is c = 0 with the right foot planted. */
const stairPhase = (c: number) => THREE.MathUtils.euclideanModulo(c / 2, 1);

/** Drink parks here with the glass held at the chest. */
const KITCHEN_HOLD = 0.62;

/**
 * Pauses on the stairs use clip progress 0.375 or 0.875, where both feet are planted on a tread. The person stops
 * one tread above their year sign, so the sign is in clear view below and ahead of them, not behind their head.
 */
const CAREER_STAIRS = [1.75, 6.75, 11.75];

const careerStop = (index: number): HouseStop => {
  const c = CAREER_STAIRS[index];
  const [x, y, z] = stairPoint(c);
  const [, signY, signZ] = stairPoint(c + 1);
  // At the first stop the newel post at the top of the stairs would stand between the camera and the person, so
  // the camera moves further down the stairs to see the person past the post's near side.
  const cameraZ = index === 0 ? z + 1.6 : z + 0.85;
  return {
    id: 'career-' + String(index + 1),
    chapter: 'career',
    label: 'Career / Down the stairs',
    side: 'left',
    position: [x, y, z],
    yaw: 0,
    action: 'StairsDown',
    hold: stairPhase(c),
    camera: { position: [1.05, y + 1.2, cameraZ], target: [3.75, y + 1.15, z + 0.15], fov: 44 },
    sign: [4.985, signY + 1.6, signZ + 0.15],
  };
};

export const houseStops: HouseStop[] = [
  {
    id: 'top',
    chapter: 'top',
    label: 'The study',
    side: 'left',
    position: [-3.3, 3.02, -2.1],
    yaw: -Math.PI / 2,
    action: 'Typing',
    camera: { position: [-2.3, 4.45, -1.15], target: [-3.55, 3.98, -2.2], fov: 50 },
  },
  {
    id: 'profile',
    chapter: 'profile',
    label: 'Profile / The landing',
    side: 'right',
    position: [2.2, 3.02, -0.64],
    yaw: 0,
    action: 'LeanRail',
    camera: { position: [3.45, 4.5, 2.45], target: [1.85, 3.95, -0.75], fov: 40 },
  },
  careerStop(0),
  careerStop(1),
  careerStop(2),
  {
    id: 'works-1',
    chapter: 'works',
    label: 'Works / On the TV',
    side: 'left',
    position: [-1.55, 0.02, 2.3],
    yaw: -Math.PI / 2,
    action: 'SitIdle',
    camera: { position: [-2.0, 1.415, 2.1], target: [-4.5, 1.415, 2.1], fov: 48 },
  },
  {
    id: 'works-2',
    chapter: 'works',
    label: 'Works / On the TV',
    side: 'left',
    position: [-1.55, 0.02, 2.3],
    yaw: -Math.PI / 2,
    action: 'SitIdle',
    camera: { position: [-2.0, 1.415, 2.1], target: [-4.5, 1.415, 2.1], fov: 48 },
  },
  {
    id: 'works-3',
    chapter: 'works',
    label: 'Works / On the TV',
    side: 'left',
    position: [-1.55, 0.02, 2.3],
    yaw: -Math.PI / 2,
    action: 'SitIdle',
    camera: { position: [-2.0, 1.415, 2.1], target: [-4.5, 1.415, 2.1], fov: 48 },
  },
  {
    id: 'kitchen',
    chapter: 'links',
    label: 'Links / A break in the kitchen',
    side: 'left',
    // A step back from the island (0.33 m from its edge): the glass is reached with a nearly straight arm.
    position: [0.755, 0.02, -0.95],
    yaw: -Math.PI / 2,
    action: 'Drink',
    hold: KITCHEN_HOLD,
    // A three-quarter view from the person's left keeps the drinking hand beyond the face.
    camera: { position: [-1.045, 1.65, 0.35], target: [0.705, 1.3, -0.95], fov: 38 },
  },
  {
    id: 'contact',
    chapter: 'contact',
    label: 'Contact / Outside',
    side: 'left',
    position: [1.25, 0.02, 6.6],
    // Waving to the camera, which has stepped back past the garden's edge to eye level on the road: the closing shot
    // takes in the whole front of the house at dusk, the dusk sky over the roof, and the path leading up to the
    // person at the lit door.
    yaw: 0.34,
    action: 'Wave',
    camera: { position: [5.6, 1.6, 19.0], target: [0.9, 3.5, 3.0], fov: 38 },
  },
];

const transitions: Transition[] = [
  {
    // Push the chair back clear of the desk, step round it, then out of the study door to the rail.
    depart: [{ action: 'StandUp', from: 0, until: 0.18 }],
    slide: [0.35, 0, 0],
    legs: [
      {
        kind: 'walk',
        points: [
          [-2.95, 3.02, -2.1],
          [-2.95, 3.02, -1.4],
          [-1.2, 3.02, -1.4],
          [-0.5, 3.02, -2.1],
          [1.3, 3.02, -2.1],
          [2.2, 3.02, -1.4],
          [2.2, 3.02, -0.64],
        ],
      },
    ],
    // The camera eases back and up while the person stands, then goes ahead of them: straight through the
    // middle of the doorway, below its head, and backs into the hall's far corner to watch them come through.
    // From there it swings round over the top of the stairs onto the rail. Moving ahead of the person keeps
    // it clear of the door frame, so it never has to squeeze through behind them.
    camera: [
      { at: 0.2, position: [-0.6, 4.75, -0.6], fov: 54 },
      { at: 0.45, position: [0.0, 4.85, -2.1], fov: 58 },
      { at: 0.58, position: [1.6, 4.8, -2.1], fov: 58 },
      { at: 0.75, position: [2.9, 4.75, -2.7], fov: 54 },
    ],
    pullBack: 0,
  },
  {
    legs: [
      {
        kind: 'walk',
        points: [
          [2.2, 3.02, -0.64],
          [2.45, 3.02, -1.55],
          [3.62, 3.02, -1.75],
          [3.62, 3.02, -1.12],
        ],
      },
      { kind: 'stairs', from: 0, to: CAREER_STAIRS[0] },
    ],
    camera: [
      { at: 0.35, position: [2.0, 4.6, 1.2] },
      { at: 0.7, position: [0.7, 4.0, 1.3] },
    ],
  },
  { legs: [{ kind: 'stairs', from: CAREER_STAIRS[0], to: CAREER_STAIRS[1] }], camera: [] },
  { legs: [{ kind: 'stairs', from: CAREER_STAIRS[1], to: CAREER_STAIRS[2] }], camera: [] },
  {
    // Off the stairs, round to the sofa, sit down, then dive into the television.
    legs: [
      { kind: 'stairs', from: CAREER_STAIRS[2], to: STAIR_COUNT },
      {
        kind: 'walk',
        points: [
          stairPoint(STAIR_COUNT),
          [3.0, 0.02, 4.1],
          [1.0, 0.02, 4.2],
          [-1.95, 0.02, 4.2],
          [-1.95, 0.02, 2.3],
          [-1.55, 0.02, 2.3],
        ],
      },
    ],
    arrive: [{ action: 'SitDown', from: 0.62, until: 0.76 }],
    camera: [
      { at: 0.18, position: [1.0, 2.6, 1.2] },
      { at: 0.4, position: [1.4, 2.1, 1.4] },
      { at: 0.6, position: [0.4, 1.7, 2.9] },
      { at: 0.78, position: [0.2, 1.62, 2.45], look: [-4.5, 1.35, 2.1], fov: 46 },
    ],
  },
  {
    // Keep the same shot while the television changes channels.
    legs: [],
    camera: [],
    pullBack: 0,
  },
  {
    // Keep watching the television for the third project as well.
    legs: [],
    camera: [],
    pullBack: 0,
  },
  {
    // Stand up from the sofa and walk round its front end to the island.
    depart: [{ action: 'StandUp', from: 0, until: 0.16 }],
    legs: [
      {
        kind: 'walk',
        points: [
          [-1.55, 0.02, 2.3],
          [-1.95, 0.02, 2.3],
          [-1.95, 0.02, 4.1],
          [0.2, 0.02, 4.1],
          [1.1, 0.02, 2.8],
          [1.1, 0.02, -0.95],
          [0.755, 0.02, -0.95],
        ],
      },
    ],
    // The glass is picked up from the counter and held at the chest while the stop is read.
    arrive: [{ action: 'Drink', from: 0.66, until: 1, clip: [0, KITCHEN_HOLD] }],
    // The camera turns from the television to watch the person from behind, then stays on the living-room side
    // of their path, tracking them from the side down the east of the room; crossing their path, or standing
    // right beside it, would swing it round over their head.
    camera: [
      { at: 0.2, position: [-3.2, 2.2, 1.4] },
      { at: 0.42, position: [-0.9, 2.3, 2.4] },
      { at: 0.64, position: [-0.6, 2.0, 1.4] },
    ],
  },
  {
    // Put the glass back, then through the hall, out of the blue door, and a turn back to the camera.
    depart: [{ action: 'Drink', from: 0, until: 0.2, clip: [KITCHEN_HOLD, 1] }],
    legs: [
      {
        kind: 'walk',
        points: [
          [0.755, 0.02, -0.95],
          [1.6, 0.02, -0.6],
          [1.25, 0.02, 0.6],
          [1.25, 0.02, 4.8],
          [1.25, 0.02, 5.55],
          [1.25, 0.02, 6.6],
        ],
      },
    ],
    // The camera goes ahead of the person, as it does out of the study: it rises over the living room to the
    // front of the double-height hall, well clear of the stairs, and watches them walk up the hall towards it.
    // Still facing them, it backs out through the upper front window (clear of its frame and middle stiles) and
    // pulls back over the garden onto the whole house as they come out of the door. Looking back at the house
    // the whole way, it never has to turn round once outside.
    camera: [
      { at: 0.2, position: [-1.0, 2.3, 1.6], fov: 58 },
      { at: 0.42, position: [0.0, 3.4, 4.2], fov: 56 },
      { at: 0.6, position: [0.1, 4.0, 4.85], fov: 54 },
      { at: 0.74, position: [0.05, 4.3, 5.7], fov: 52 },
      { at: 0.88, position: [3.5, 4.3, 10.0], fov: 50 },
    ],
    // The keys already frame the move; easing back and up would push the camera into the front wall.
    pullBack: 0,
  },
];

const firstWork = houseStops.findIndex((stop) => stop.id === 'works-1');
/** The television and Works title start together after the person has finished sitting down. */
export const WORKS_SEATED_PROGRESS =
  firstWork - 1 + Math.max(0, ...(transitions[firstWork - 1].arrive ?? []).map((scrub) => scrub.until));

const v = (point: Triple) => new THREE.Vector3(...point);

/** Each leg keeps its own length so walking and stair speeds stay even along a transition. */
const routes = transitions.map((transition) =>
  transition.legs.map((leg) => {
    if (leg.kind === 'stairs')
      return { leg, length: v(stairPoint(leg.from)).distanceTo(v(stairPoint(leg.to))), path: null };
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < leg.points.length; i++) path.add(new THREE.LineCurve3(v(leg.points[i - 1]), v(leg.points[i])));
    return { leg, length: path.getLength(), path };
  }),
);

const routeLengths = routes.map((legs) => legs.reduce((sum, item) => sum + item.length, 0));

const cameraPaths = transitions.map((transition, index) => {
  const start = houseStops[index];
  const end = houseStops[index + 1];
  const keys: CameraKey[] = [
    { at: 0, position: start.camera.position, look: start.camera.target, fov: start.camera.fov },
    ...transition.camera,
    { at: 1, position: end.camera.position, look: end.camera.target, fov: end.camera.fov },
  ];
  return {
    keys,
    positions: new THREE.CatmullRomCurve3(
      keys.map((key) => v(key.position)),
      false,
      'centripetal',
    ),
    targets: new THREE.CatmullRomCurve3(
      keys.map((key) => v(key.look ?? [0, 0, 0])),
      false,
      'centripetal',
    ),
  };
});

/** How far ahead along the route a following camera looks, so the person has space to walk into. */
const LEAD_ROOM = 0.8;

const headHeight = (action: string) => (['Typing', 'SitIdle', 'SitDown'].includes(action) ? 0.8 : 0.95);

function sampleRoute(index: number, walking: number) {
  const legs = routes[index];
  const total = routeLengths[index];
  let distance = walking * total;
  for (const [legIndex, item] of legs.entries()) {
    const isLast = legIndex === legs.length - 1;
    if (distance > item.length && !isLast) {
      distance -= item.length;
      continue;
    }
    const ratio = item.length > 0 ? THREE.MathUtils.clamp(distance / item.length, 0, 1) : 1;
    if (item.leg.kind === 'stairs') {
      const c = THREE.MathUtils.lerp(item.leg.from, item.leg.to, ratio);
      return { position: v(stairPoint(c)), yaw: 0, action: 'StairsDown', actionProgress: stairPhase(c) };
    }
    const path = item.path;
    if (!path) break;
    const tangent = path.getTangentAt(THREE.MathUtils.clamp(ratio, 0.001, 0.999));
    return {
      position: path.getPointAt(ratio),
      yaw: Math.atan2(tangent.x, tangent.z),
      action: 'Walk',
      actionProgress: null,
    };
  }
  return null;
}

function sampleCamera(index: number, fraction: number, actorTarget: THREE.Vector3) {
  const start = houseStops[index];
  const end = houseStops[index + 1];
  const { keys, positions, targets } = cameraPaths[index];
  // Only the points that follow the person change; the camera paths remain shared.
  keys.forEach((key, pointIndex) => {
    if (!key.look) targets.points[pointIndex].copy(actorTarget);
  });
  // Ease the whole move so the camera settles into each stop instead of stopping at every key.
  const eased = THREE.MathUtils.smootherstep(fraction, 0, 1);
  let segment = 0;
  while (segment < keys.length - 2 && eased > keys[segment + 1].at) segment++;
  const local = (eased - keys[segment].at) / Math.max(0.0001, keys[segment + 1].at - keys[segment].at);
  const curveProgress = (segment + THREE.MathUtils.clamp(local, 0, 1)) / (keys.length - 1);
  const fovAt = (key: CameraKey) =>
    key.fov ?? THREE.MathUtils.lerp(start.camera.fov, end.camera.fov, THREE.MathUtils.smoothstep(key.at, 0, 1));
  return {
    camera: positions.getPoint(curveProgress),
    target: targets.getPoint(curveProgress),
    fov: THREE.MathUtils.lerp(fovAt(keys[segment]), fovAt(keys[segment + 1]), THREE.MathUtils.smoothstep(local, 0, 1)),
  };
}

/**
 * The opening flies from the garden, through the large west window of the study, round to the hero shot.
 * The window spans z -3.8 to -0.25 between y 3.56 and 5.76, and the path passes above the two west trees.
 */
const openingKeys: CameraKey[] = [
  { at: 0, position: [-6, 6.8, 16], look: [-0.5, 3.0, 0], fov: 46 },
  { at: 0.3, position: [-13, 6.2, 7.0], look: [-2.5, 4.2, -1.5], fov: 42 },
  { at: 0.55, position: [-8.5, 4.7, -0.75], look: [-3.3, 4.2, -2.0], fov: 44 },
  { at: 0.72, position: [-5.6, 4.5, -0.85], look: [-3.3, 4.1, -2.1], fov: 48 },
  { at: 0.86, position: [-3.7, 4.8, -0.8], look: [-3.6, 4.0, -2.15], fov: 50 },
  {
    at: 1,
    position: houseStops[0].camera.position,
    look: houseStops[0].camera.target,
    fov: houseStops[0].camera.fov,
  },
];
const openingPositions = new THREE.CatmullRomCurve3(
  openingKeys.map((key) => v(key.position)),
  false,
  'centripetal',
);
const openingTargets = new THREE.CatmullRomCurve3(
  openingKeys.map((key) => v(key.look ?? key.position)),
  false,
  'centripetal',
);

/** Camera for the opening, from 0 (garden) to 1 (the hero shot of the study). */
export function sampleOpening(progress: number) {
  const eased = THREE.MathUtils.smootherstep(progress, 0, 1);
  let segment = 0;
  while (segment < openingKeys.length - 2 && eased > openingKeys[segment + 1].at) segment++;
  const from = openingKeys[segment];
  const to = openingKeys[segment + 1];
  const local = THREE.MathUtils.clamp((eased - from.at) / (to.at - from.at), 0, 1);
  const curveProgress = (segment + local) / (openingKeys.length - 1);
  return {
    camera: openingPositions.getPoint(curveProgress),
    target: openingTargets.getPoint(curveProgress),
    fov: THREE.MathUtils.lerp(from.fov ?? 48, to.fov ?? 48, THREE.MathUtils.smoothstep(local, 0, 1)),
  };
}

/** Inside the house the camera stays within the walls, and under the upper floor below its ceiling. */
const isIndoors = (point: THREE.Vector3) => Math.abs(point.x) < 4.85 && point.z > -3.85 && point.z < 5.05;
/** How far a point is, across the floor plan, from the area under the upper floor (0 when it is under it). */
const distanceFromUpperFloor = (point: THREE.Vector3) => {
  const pastBackHall = Math.max(0, point.z + 1.3);
  const pastFrontRooms = Math.hypot(Math.max(0, point.x - 2.9), Math.max(0, point.z + 0.3));
  return Math.min(pastBackHall, pastFrontRooms);
};

/**
 * While travelling indoors the camera eases back and up for a wider, more overhead view on a wider lens, and
 * eases in again over the second half of the move, so it never lurches on the way into a stop.
 * It is kept inside the walls and below the ceiling it is under. Outdoor shots are wide already.
 * Returns how far the lens is widened, in degrees.
 */
function pullBack(camera: THREE.Vector3, target: THREE.Vector3, fraction: number, strength: number) {
  const away = camera.clone().sub(target).setY(0);
  // The direction away from the target turns round when the target passes under the camera, so the pull fades
  // out there; otherwise the camera would jump across the room in a single frame.
  const amount =
    strength *
    THREE.MathUtils.smoothstep(fraction, 0.05, 0.4) *
    (1 - THREE.MathUtils.smoothstep(fraction, 0.6, 0.98)) *
    THREE.MathUtils.smoothstep(away.length(), 0.3, 1.2);
  if (amount === 0 || !isIndoors(camera)) return 0;
  camera.addScaledVector(away.normalize(), 0.9 * amount).add(new THREE.Vector3(0, 0.9 * amount, 0));
  camera.x = THREE.MathUtils.clamp(camera.x, -4.85, 4.85);
  camera.z = THREE.MathUtils.clamp(camera.z, -3.85, 5.05);
  // Downstairs the ceiling is 2.8 m under the upper floor and 5.8 m in the double-height rooms. The limit eases
  // between the two over 0.6 m, so the camera never drops a step as it passes under the floor's edge.
  const open = target.y < 3 ? THREE.MathUtils.smoothstep(distanceFromUpperFloor(camera), 0, 0.6) : 1;
  camera.y = Math.min(camera.y, THREE.MathUtils.lerp(2.8, 5.8, open));
  return 8 * amount;
}

const sideShift = (side: PanelSide) => ({ left: -1, right: 1, none: 0 })[side];

/** Walking is deliberately separate from Blender actions, so new clips keep the same route. */
export function sampleHouseTour(progress: number) {
  const index = THREE.MathUtils.clamp(Math.floor(progress), 0, transitions.length - 1);
  const fraction = THREE.MathUtils.clamp(progress - index, 0, 1);
  const start = houseStops[index];
  const end = houseStops[index + 1];
  const transition = transitions[index];
  const departEnd = Math.max(0.06, ...(transition.depart ?? []).map((scrub) => scrub.until));
  const walkEnd = Math.min(0.96, ...(transition.arrive ?? []).map((scrub) => scrub.from));
  const walking = THREE.MathUtils.clamp((fraction - departEnd) / (walkEnd - departEnd), 0, 1);
  const routed = transition.legs.length > 0 ? sampleRoute(index, walking) : null;
  // The slide finishes early in StandUp, before the knees swing forward past the desk edge.
  const departed = THREE.MathUtils.smoothstep(fraction, 0, departEnd * 0.6);

  let position = v(start.position).addScaledVector(v(transition.slide ?? [0, 0, 0]), departed);
  let yaw = start.yaw;
  let action = start.action;
  let actionProgress: number | null = start.hold ?? null;
  if (routed && walking > 0 && walking < 1) {
    ({ position, yaw, action, actionProgress } = routed);
  } else if (routed && walking >= 1) {
    position = routed.position;
    yaw = end.yaw;
    action = end.action;
    actionProgress = end.hold ?? null;
  }
  const scrub = [...(transition.depart ?? []), ...(transition.arrive ?? [])].find(
    (item) => fraction >= item.from && fraction < item.until,
  );
  if (scrub && fraction > 0.002) {
    const [clipStart, clipEnd] = scrub.clip ?? [0, 1];
    action = scrub.action;
    actionProgress = THREE.MathUtils.lerp(clipStart, clipEnd, (fraction - scrub.from) / (scrub.until - scrub.from));
  }
  if (fraction >= 0.998) {
    position = v(end.position);
    yaw = end.yaw;
    action = end.action;
    actionProgress = end.hold ?? null;
  }

  // Lead room: while walking, a following camera looks a little ahead along the route, so the person sits
  // off centre with space in front. It builds up over the first metre and runs out at the end of the route.
  // Only the sideways part of the lead is used: walking towards or away from the camera would otherwise pull
  // the aim down onto the floor in front of the lens.
  const head = position.clone().add(new THREE.Vector3(0, headHeight(action), 0));
  let actorTarget = head;
  if (routed && walking > 0 && walking < 1) {
    const total = routeLengths[index];
    const lead = LEAD_ROOM * THREE.MathUtils.smoothstep(walking * total, 0, 1.2);
    const ahead = sampleRoute(index, Math.min(1, walking + lead / total))?.position ?? position;
    const viewing = head
      .clone()
      .sub(sampleCamera(index, fraction, head).camera)
      .setY(0)
      .normalize();
    const sideways = ahead.clone().sub(position).setY(0);
    sideways.addScaledVector(viewing, -sideways.dot(viewing));
    actorTarget = head.clone().add(sideways);
  }
  const sampled = sampleCamera(index, fraction, actorTarget);
  const { camera, target } = sampled;
  const fov = sampled.fov + pullBack(camera, target, fraction, transition.pullBack ?? 1);

  // Panels and shading belong to the stops. While travelling, the house fills the screen.
  const leaving = 1 - THREE.MathUtils.smoothstep(fraction, 0, 0.32);
  const arriving = THREE.MathUtils.smoothstep(fraction, 0.68, 1);
  const isChannelChange = start.chapter === 'works' && end.chapter === 'works';
  const shift = isChannelChange
    ? sideShift(start.side)
    : sideShift(start.side) * leaving + sideShift(end.side) * arriving;
  const focus = isChannelChange ? 1 : Math.max(leaving, arriving);
  const stopIndex = Math.round(index + fraction);
  const door = index === transitions.length - 1 ? THREE.MathUtils.smoothstep(fraction, 0.5, 0.72) : 0;
  // The desk chair stays pushed back once the person has left the study.
  const chair = index === 0 ? departed : 1;

  return {
    position,
    yaw,
    camera,
    target,
    action,
    actionProgress,
    fraction,
    index,
    fov,
    shift,
    focus,
    stopIndex,
    door,
    chair,
  };
}
