import { Asset } from 'expo-asset';

export const laughAudioModule = require('../assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.mp3');

// Replace this with the exported GLB after the MMD conversion pipeline finishes.
// Example:
// export const modelGlbModule = require('../assets/exports/taffy-laugh.glb');
export const modelGlbModule: number | null = null;

export async function resolveAssetUri(moduleId: number) {
  const [asset] = await Asset.loadAsync(moduleId);
  return asset.localUri ?? asset.uri;
}
