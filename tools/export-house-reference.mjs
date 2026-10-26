import { mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import process from 'node:process';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createHouseWorld } from '../src/scripts/house-world.ts';
import { houseStops, sampleHouseTour } from '../src/scripts/house-tour.ts';

// Export geometry and colours only. The browser draws wood grain on a canvas.
globalThis.document = { createElement: () => ({ getContext: () => null }) };
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const { group } = createHouseWorld();
const scene = new THREE.Scene();
const matrix = new THREE.Matrix4();
let count = 0;
group.updateMatrixWorld(true);
group.traverse((object) => {
  if (!(object instanceof THREE.Mesh)) return;
  // Ordinary mesh nodes can be edited individually in Blender without instancing extensions.
  if (object instanceof THREE.InstancedMesh) {
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, matrix);
      const mesh = new THREE.Mesh(object.geometry, object.material);
      mesh.name = 'House_' + String(++count);
      mesh.applyMatrix4(object.matrixWorld.clone().multiply(matrix));
      scene.add(mesh);
    }
  } else {
    const mesh = new THREE.Mesh(object.geometry, object.material);
    mesh.name = 'Entrance_' + String(++count);
    mesh.applyMatrix4(object.matrixWorld);
    scene.add(mesh);
  }
});

for (const [index, stop] of houseStops.entries()) {
  const marker = new THREE.Object3D();
  marker.name = 'Actor_' + stop.id + '_' + stop.action;
  marker.position.set(...stop.position);
  marker.rotation.y = stop.yaw;
  scene.add(marker);
  const shot = sampleHouseTour(index);
  const camera = new THREE.PerspectiveCamera(shot.fov, 1.5, 0.05, 90);
  camera.name = 'Camera_' + stop.id;
  camera.position.copy(shot.camera);
  camera.lookAt(shot.target);
  scene.add(camera);
}

const directory = new URL('../output/house-journey-implementation/', import.meta.url);
await mkdir(directory, { recursive: true });
const binary = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(new URL('house-reference.glb', directory), Buffer.from(binary));
process.stdout.write(
  '家の参照GLBを書き出しました。' + String(count) + ' objects / ' + String(binary.byteLength) + ' bytes\n',
);
