import fs from 'node:fs/promises';
import path from 'node:path';

import { NodeIO } from '@gltf-transform/core';
import { EXTTextureWebP, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, prune, quantize, resample, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

function printUsage() {
  console.error(
    'Usage: node tools/gltf/optimize-glb.mjs <input.glb> [output.glb] [--max-texture-size 1536] [--quality 92] [--effort 6]'
  );
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatMiB(byteLength) {
  return `${(byteLength / (1024 * 1024)).toFixed(2)} MiB`;
}

function inferTextureExtension(mimeType) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

function ensureTextureUris(document) {
  document.getRoot().listTextures().forEach((texture, index) => {
    if (texture.getURI()) return;
    const fallbackBaseName = texture.getName()?.trim() || `texture-${String(index + 1).padStart(2, '0')}`;
    texture.setURI(`${fallbackBaseName}.${inferTextureExtension(texture.getMimeType())}`);
  });
}

const argv = process.argv.slice(2);
const positional = [];
const options = {
  maxTextureSize: 1536,
  quality: 92,
  effort: 6,
};

for (let index = 0; index < argv.length; index += 1) {
  const token = argv[index];
  if (token === '--max-texture-size') {
    options.maxTextureSize = parsePositiveInt(argv[index + 1], options.maxTextureSize);
    index += 1;
    continue;
  }
  if (token === '--quality') {
    options.quality = parsePositiveInt(argv[index + 1], options.quality);
    index += 1;
    continue;
  }
  if (token === '--effort') {
    options.effort = parsePositiveInt(argv[index + 1], options.effort);
    index += 1;
    continue;
  }
  positional.push(token);
}

const inputPath = positional[0];
const outputPath = positional[1] ?? inputPath;

if (!inputPath) {
  printUsage();
  process.exit(1);
}

const io = new NodeIO().registerExtensions([KHRMeshQuantization, EXTTextureWebP]);
const document = await io.read(inputPath);

ensureTextureUris(document);

await document.transform(
  resample({ tolerance: 1e-4 }),
  dedup({ keepUniqueNames: true }),
  prune(),
  quantize({
    quantizePosition: 14,
    quantizeNormal: 10,
    quantizeTexcoord: 12,
    quantizeColor: 8,
    quantizeWeight: 8,
    quantizeGeneric: 12,
    patternTargets: /^$/,
  }),
  textureCompress({
    encoder: sharp,
    targetFormat: 'webp',
    resize: [options.maxTextureSize, options.maxTextureSize],
    quality: options.quality,
    effort: options.effort,
  }),
  dedup({ keepUniqueNames: true }),
  prune()
);

await io.write(outputPath, document);

const [beforeStats, afterStats] = await Promise.all([fs.stat(inputPath), fs.stat(outputPath)]);
const savedBytes = beforeStats.size - afterStats.size;
const savedPercent = beforeStats.size > 0 ? (savedBytes / beforeStats.size) * 100 : 0;

console.log(`Optimized GLB: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
console.log(`Before: ${formatMiB(beforeStats.size)}`);
console.log(`After:  ${formatMiB(afterStats.size)}`);
console.log(`Saved:  ${formatMiB(savedBytes)} (${savedPercent.toFixed(1)}%)`);
