import { NodeIO } from '@gltf-transform/core';

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? inputPath;

if (!inputPath) {
  console.error('Usage: node tools/gltf/patch-glb-materials.mjs <input.glb> [output.glb]');
  process.exit(1);
}

const opaqueMaterials = new Set(['Body', 'Ear']);
const blendMaterials = new Set(['Dark+Water']);

const io = new NodeIO();
const document = await io.read(inputPath);
const root = document.getRoot();

for (const material of root.listMaterials()) {
  const name = material.getName();

  if (blendMaterials.has(name)) {
    material.setAlphaMode('BLEND');
    material.setAlphaCutoff(0);
    material.setDoubleSided(true);
    continue;
  }

  if (opaqueMaterials.has(name)) {
    material.setAlphaMode('OPAQUE');
    material.setAlphaCutoff(0);
    material.setDoubleSided(true);
    continue;
  }

  material.setAlphaMode('MASK');
  material.setAlphaCutoff(0.5);
  material.setDoubleSided(true);
}

await io.write(outputPath, document);

console.log(`Patched GLB materials: ${outputPath}`);
