import { NodeIO } from '@gltf-transform/core';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node tools/gltf/inspect-glb.mjs <input.glb>');
  process.exit(1);
}

const io = new NodeIO();
const document = await io.read(inputPath);
const root = document.getRoot();

const payload = {
  materials: root.listMaterials().map((material) => ({
    name: material.getName(),
    alphaMode: material.getAlphaMode(),
    alphaCutoff: material.getAlphaCutoff(),
    doubleSided: material.getDoubleSided(),
  })),
  meshes: root.listMeshes().map((mesh) => ({
    name: mesh.getName(),
    primitives: mesh.listPrimitives().map((primitive, index) => ({
      index,
      targetCount: primitive.listTargets().length,
      material: primitive.getMaterial()?.getName() ?? null,
    })),
  })),
  animations: root.listAnimations().map((animation) => ({
    name: animation.getName(),
    channelCount: animation.listChannels().length,
    samplerCount: animation.listSamplers().length,
  })),
};

console.log(JSON.stringify(payload, null, 2));
