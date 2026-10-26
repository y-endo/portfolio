import * as THREE from 'three';

export const houseStops = [
  {
    id: 'top',
    label: 'The study',
    position: [-3.3, 3.02, -2.1],
    yaw: -Math.PI / 2,
    camera: [-3.0, 4.6, -0.35],
    fov: 62,
    action: 'Typing',
  },
  {
    id: 'profile',
    label: 'Profile / The landing',
    position: [3.5, 3.02, -1.87],
    yaw: 0.1,
    camera: [0.05, 5.05, 1.25],
    fov: 48,
    action: 'Idle',
  },
  {
    id: 'career',
    label: 'Career / The living room',
    position: [-1.55, 0.02, 1.7],
    yaw: -Math.PI / 2,
    camera: [-3.7, 1.8, 3.65],
    fov: 48,
    action: 'SitIdle',
  },
  {
    id: 'works',
    label: 'Works / The kitchen',
    position: [0.85, 0.02, -1.8],
    yaw: -Math.PI / 3,
    camera: [2.7, 1.9, 1.1],
    fov: 48,
    action: 'Idle',
  },
  {
    id: 'contact',
    label: 'Contact / Outside',
    position: [3.75, 0.02, 5.4],
    yaw: 0.2,
    camera: [8.2, 3.8, 12.8],
    fov: 48,
    action: 'Idle',
  },
] as const;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const cameraAlong = (frames: [number, THREE.Vector3][], progress: number) => {
  for (let i = 1; i < frames.length; i++) {
    if (progress > frames[i][0]) continue;
    const [startTime, start] = frames[i - 1];
    const [endTime, end] = frames[i];
    return start.clone().lerp(end, THREE.MathUtils.smoothstep(progress, startTime, endTime));
  }
  return frames[frames.length - 1][1].clone();
};
const positions = houseStops.map((stop) => new THREE.Vector3(...stop.position));
const stairs = Array.from({ length: 15 }, (_, i) => v(3.62, 3.02 - i * 0.2, -1.12 + i * 0.32));
const routes = [
  [positions[0], v(-1, 3.02, -2.1), v(1.3, 3.02, -2.1), positions[1]],
  [
    positions[1],
    ...stairs,
    v(3.62, 0.02, 3.7),
    v(1.6, 0.02, 3.7),
    v(-1.7, 0.02, 3.45),
    v(-1.7, 0.02, 1.7),
    positions[2],
  ],
  [positions[2], v(-1.8, 0.02, 1.7), v(-1.8, 0.02, 0.65), v(1.1, 0.02, 0.65), v(1.1, 0.02, -1.8), positions[3]],
  [
    positions[3],
    v(1.75, 0.02, -1.7),
    v(1.8, 0.02, 0.5),
    v(2.6, 0.02, 3.78),
    v(3.75, 0.02, 3.78),
    v(3.75, 0.02, 4.35),
    positions[4],
  ],
].map((points) => {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(points[i - 1], points[i]));
  return path;
});

/** Walking is deliberately separate from Blender actions, so new clips keep the same route. */
export function sampleHouseTour(progress: number) {
  const index = Math.min(3, Math.floor(progress));
  const fraction = THREE.MathUtils.clamp(progress - index, 0, 1);
  const start = houseStops[index];
  const end = houseStops[index + 1];
  const standEnd = start.action === 'Typing' || start.action === 'SitIdle' ? 0.2 : 0.08;
  const sitStart = end.action === 'SitIdle' ? 0.83 : 0.96;
  const walking = THREE.MathUtils.clamp((fraction - standEnd) / (sitStart - standEnd), 0, 1);
  const route = routes[index];
  const position = route.getPointAt(walking);
  const tangent = route.getTangentAt(Math.max(0.001, Math.min(0.999, walking)));
  const yaw = walking === 0 ? start.yaw : walking === 1 ? end.yaw : Math.atan2(tangent.x, tangent.z);
  let action: string = 'Walk';
  let actionProgress: number | null = null;
  if (fraction <= 0.002) action = start.action;
  else if (fraction >= 0.998) action = end.action;
  else if (fraction < standEnd && standEnd === 0.2) {
    action = 'StandUp';
    actionProgress = fraction / standEnd;
  } else if (fraction > sitStart && end.action === 'SitIdle') {
    action = 'SitDown';
    actionProgress = (fraction - sitStart) / (1 - sitStart);
  } else if (walking === 0 || walking === 1) action = walking === 0 ? start.action : end.action;
  const ease = THREE.MathUtils.smoothstep(fraction, 0, 1);
  let camera = new THREE.Vector3(...start.camera).lerp(new THREE.Vector3(...end.camera), ease);
  let fov = THREE.MathUtils.lerp(start.fov, end.fov, ease);
  if (index === 0) {
    camera = cameraAlong(
      [
        [0, new THREE.Vector3(...start.camera)],
        [0.35, v(-2.5, 4.8, -1.9)],
        [0.65, v(-1.2, 4.9, -2.1)],
        [0.85, v(1.0, 4.9, -2.1)],
        [0.93, v(1.4, 5.0, 0.3)],
        [1, new THREE.Vector3(...end.camera)],
      ],
      fraction,
    );
    fov = THREE.MathUtils.lerp(62, 48, THREE.MathUtils.smoothstep(fraction, 0.85, 1));
  }
  // The staircase camera stays on the open living-room side of the rail.
  if (index === 1 && walking > 0 && walking < 0.68)
    camera.lerp(v(0.6, position.y + 2.2, position.z + 1.5), Math.sin((walking / 0.68) * Math.PI) * 0.8);
  if (index === 1) camera.z = Math.min(camera.z, 3.65);
  const target = position.clone().add(v(0, action === 'SitIdle' || action === 'Typing' ? 0.8 : 0.95, 0));
  if (index === 3) {
    camera = cameraAlong(
      [
        [0, new THREE.Vector3(...start.camera)],
        [0.4, v(1.5, 2.0, 0.4)],
        [0.7, v(1.5, 2.2, 1.8)],
        [0.82, v(3.75, 2.25, 3.75)],
        [0.87, v(3.75, 2.25, 4.35)],
        [0.93, v(4.5, 3.8, 6.5)],
        [1, new THREE.Vector3(...end.camera)],
      ],
      fraction,
    );
    target.lerp(v(1.0, 2.3, 2.3), THREE.MathUtils.smoothstep(fraction, 0.88, 1));
    const doorway =
      THREE.MathUtils.smoothstep(fraction, 0.15, 0.45) * (1 - THREE.MathUtils.smoothstep(fraction, 0.88, 1));
    fov += doorway * 32;
  }
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
  };
}
