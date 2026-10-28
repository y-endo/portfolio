import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { houseStops, WORKS_SEATED_PROGRESS } from './house-tour';

type Pose = { position: THREE.Vector3; rotation: THREE.Quaternion; scale: number };

/** Real letters in the house, placed clear of the subject and the HTML reading panels. */
export function createHouseHeadings(font: Font) {
  const group = new THREE.Group();
  const headings = [
    {
      text: 'Yuki Endo',
      chapter: 'top',
      height: 0.2,
      introduction: { height: 72, narrowHeight: 44, row: 0 },
    },
    {
      text: 'Portfolio',
      chapter: 'top',
      height: 0.25,
      introduction: { height: 96, narrowHeight: 62, row: 1 },
    },
    {
      text: 'Frontend Engineer',
      chapter: 'top',
      height: 0.08,
      introduction: { height: 24, narrowHeight: 20, row: 2 },
    },
    { text: 'Profile', chapter: 'profile', height: 0.21 },
    { text: 'Career', chapter: 'career', height: 0.18 },
    { text: 'Works', chapter: 'works', height: 0.24 },
    { text: 'Links', chapter: 'links', height: 0.14 },
  ].map((item) => {
    const geometry = new TextGeometry(item.text, {
      font,
      size: 1,
      depth: item.chapter === 'top' ? 0.14 : 0.09,
      curveSegments: 6,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.006,
      bevelSegments: 1,
    });
    geometry.center();
    geometry.computeBoundingBox();
    if (item.chapter === 'top') {
      geometry.translate(0, 0, -(geometry.boundingBox?.max.z ?? 0));
      geometry.computeBoundingBox();
    }
    const glyphHeight = geometry.boundingBox?.getSize(new THREE.Vector3()).y ?? 1;
    const glyphWidth = geometry.boundingBox?.getSize(new THREE.Vector3()).x ?? 1;
    const materials = [
      new THREE.MeshBasicMaterial({
        color: item.chapter === 'top' && item.text !== 'Portfolio' ? 0x121620 : 0x304df0,
        toneMapped: false,
        transparent: true,
      }),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true }),
    ];
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.name = item.text;
    mesh.receiveShadow = true;
    group.add(mesh);
    const stops = houseStops.flatMap((stop, index) => (stop.chapter === item.chapter ? [index] : []));
    return {
      ...item,
      introduction: 'introduction' in item ? item.introduction : null,
      mesh,
      materials,
      glyphHeight,
      glyphWidth,
      stops,
      originalPositions: item.chapter === 'top' ? geometry.getAttribute('position').clone() : null,
      appearance: 0,
      isAnchored: false,
      poses: [] as Pose[],
    };
  });
  const yaw = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 1, 0);
  const retreat = new THREE.Vector3();
  const tilt = new THREE.Euler();

  function layout(width: number, height: number, careerCardRight = 0, introductionLeft = 0) {
    const isNarrow = width <= 768;
    for (const heading of headings) {
      const displayedStops = heading.chapter === 'career' ? heading.stops.slice(0, 1) : heading.stops;
      heading.poses = displayedStops.map((index) => {
        const stop = houseStops[index];
        const camera = new THREE.PerspectiveCamera();
        camera.position.set(...stop.camera.position);
        camera.lookAt(new THREE.Vector3(...stop.camera.target));
        camera.aspect = width / height;
        const halfHeight = Math.tan(THREE.MathUtils.degToRad(stop.camera.fov / 2)) * Math.max(1, 1.5 / camera.aspect);
        camera.fov = Math.min(80, THREE.MathUtils.radToDeg(Math.atan(halfHeight)) * 2);
        camera.setViewOffset(
          width,
          height,
          isNarrow ? 0 : width * (stop.side === 'left' ? -1 : 1) * 0.18,
          isNarrow ? height * (heading.chapter === 'works' ? 0.24 : 0.2) : 0,
          width,
          height,
        );
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        const position = new THREE.Vector3(...stop.position);
        if (heading.chapter === 'profile') position.add(new THREE.Vector3(0, 1.84, -0.3));
        if (heading.chapter === 'links') position.add(new THREE.Vector3(-0.55, 1.65, 0));
        if (heading.chapter === 'works') position.set(-4.558, 2.1, 2.1);
        if (heading.chapter === 'career') {
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          position.addScaledVector(right, isNarrow ? 0.85 : -0.5);
          position.y += isNarrow ? 0.8 : 1;
        }
        let scale = (heading.height * (isNarrow && heading.chapter === 'profile' ? 1.12 : 1)) / heading.glyphHeight;
        if (heading.introduction) {
          const introduction = heading.introduction;
          const distance = 1.35 * (isNarrow ? 0.4 : 1);
          const left = introductionLeft + (isNarrow ? 16 : 64);
          const availableWidth = isNarrow ? width - left - introductionLeft : width * 0.5 - left;
          const pixels = Math.min(
            isNarrow ? introduction.narrowHeight : introduction.height,
            (Math.max(1, availableWidth) * heading.glyphHeight) / heading.glyphWidth,
          );
          const nameHeight = isNarrow ? 44 : 72;
          const portfolioHeight = isNarrow ? 62 : 96;
          const roleHeight = isNarrow ? 20 : 24;
          const firstGap = isNarrow ? 14 : 18;
          const secondGap = isNarrow ? 20 : 24;
          const totalHeight = nameHeight + firstGap + portfolioHeight + secondGap + roleHeight;
          const centres = [nameHeight / 2, nameHeight + firstGap + portfolioHeight / 2, totalHeight - roleHeight / 2];
          const y = height / 2 - totalHeight / 2 + centres[introduction.row];
          const unitsPerPixel = (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / height;
          scale = (unitsPerPixel * pixels) / heading.glyphHeight;
          const textWidth = (heading.glyphWidth * scale) / unitsPerPixel;
          const x = left + textWidth / 2;
          const direction = new THREE.Vector3((x / width) * 2 - 1, 1 - (y / height) * 2, 0)
            .unproject(camera)
            .sub(camera.position);
          const forward = camera.getWorldDirection(new THREE.Vector3());
          position.copy(camera.position).addScaledVector(direction, distance / direction.dot(forward));
          if (heading.originalPositions) {
            // Extrude along the resting view's rays, so the off-centre text hides its sides behind its face.
            const centre = position.clone().applyMatrix4(camera.matrixWorldInverse);
            const positions = heading.mesh.geometry.getAttribute('position');
            for (let vertex = 0; vertex < positions.count; vertex++) {
              const z = heading.originalPositions.getZ(vertex);
              const perspective = 1 - (scale * z) / distance;
              positions.setXYZ(
                vertex,
                heading.originalPositions.getX(vertex) * perspective - (centre.x * z) / distance,
                heading.originalPositions.getY(vertex) * perspective - (centre.y * z) / distance,
                z,
              );
            }
            positions.needsUpdate = true;
            heading.mesh.geometry.computeVertexNormals();
            heading.mesh.geometry.computeBoundingBox();
            heading.mesh.geometry.computeBoundingSphere();
          }
        }
        if (heading.chapter === 'career' && !isNarrow) {
          const forward = camera.getWorldDirection(new THREE.Vector3());
          const distance = position.clone().sub(camera.position).dot(forward);
          const unitsPerPixel = (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / height;
          const textWidth = (heading.glyphWidth * scale) / unitsPerPixel;
          const left = ((position.clone().project(camera).x + 1) * width - textWidth) / 2;
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          position.addScaledVector(right, Math.max(0, careerCardRight + 24 - left) * unitsPerPixel);
        }
        if (heading.chapter === 'career') {
          // Keep the travelling title on the camera side of the stair rail, at the same apparent size.
          position.lerp(camera.position, 0.45);
          scale *= 0.55;
        }
        return { position, rotation: camera.quaternion.clone(), scale };
      });
    }
  }

  function update(progress: number, isVisible: boolean, introductionElapsed: number, rememberAppearance = true) {
    group.visible = isVisible;
    if (!isVisible) return;
    for (const heading of headings) {
      const first = heading.stops[0];
      const last = heading.stops[heading.stops.length - 1];
      const startsAt = heading.chapter === 'works' ? WORKS_SEATED_PROGRESS : first - 0.35;
      const isInChapter = progress >= startsAt && progress <= last + 0.3;
      const entering = THREE.MathUtils.smoothstep(progress, startsAt, first);
      const reveal = heading.introduction
        ? THREE.MathUtils.clamp((introductionElapsed - 0.35 - heading.introduction.row * 0.12) / 1.1, 0, 1)
        : 1;
      let candidate = 0;
      if (heading.introduction) {
        if (progress < 0.4 || heading.appearance > 0) candidate = THREE.MathUtils.smoothstep(reveal, 0, 0.75);
      } else if (isInChapter) candidate = entering;
      else if (heading.appearance > 0) candidate = 1;
      const opacity = Math.max(heading.appearance, candidate);
      if (rememberAppearance) {
        heading.appearance = opacity;
        if (opacity > 0 && progress >= last) heading.isAnchored = true;
      }
      heading.mesh.visible = opacity > 0.001;
      if (!heading.mesh.visible || !heading.poses.length) continue;
      const local = heading.isAnchored
        ? heading.poses.length - 1
        : THREE.MathUtils.clamp(progress - first, 0, heading.poses.length - 1);
      const from = heading.poses[Math.floor(local)];
      const to = heading.poses[Math.min(Math.floor(local) + 1, heading.poses.length - 1)];
      const blend = THREE.MathUtils.smoothstep(local % 1, 0, 1);
      heading.mesh.position.copy(from.position).lerp(to.position, blend);
      heading.mesh.quaternion.copy(from.rotation).slerp(to.rotation, blend);
      if (heading.introduction) {
        const arriving = Math.pow(1 - reveal, 3);
        retreat.set(0.12 * arriving, -0.05 * arriving, 0).applyQuaternion(from.rotation);
        yaw.setFromEuler(tilt.set(0.14 * arriving, -0.6 * arriving, -0.04 * arriving));
      } else {
        retreat.set(0, -0.04 * (1 - opacity), -0.25 * (1 - opacity)).applyQuaternion(heading.mesh.quaternion);
        yaw.setFromAxisAngle(axis, -0.16 - (1 - opacity) * 0.55);
      }
      heading.mesh.position.add(retreat);
      heading.mesh.quaternion.multiply(yaw);
      heading.mesh.scale.setScalar(THREE.MathUtils.lerp(from.scale, to.scale, blend));
      heading.mesh.castShadow = opacity > 0.99;
      for (const material of heading.materials) {
        material.opacity = opacity;
        material.depthWrite = opacity > 0.99;
      }
    }
  }

  return { group, layout, update };
}
