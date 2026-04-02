# Naiwa Expo Prototype

This repository is an Expo-based prototype for a tap-to-replay MMD character app.

Current asset state:

- Base model archive: `永雏塔菲.7z`
- Alternate outfit archive: `永雏塔菲-兔女郎.zip`
- Motion + music archive: `关注塔菲谢谢喵MMD动作.zip`

Important note from the motion pack:

- The motion's `使用说明.txt` says the model's `センター` bone should be moved to the hip/crotch area before using the VMD.

Current app state:

- Expo app shell is in the repository root.
- Audio playback is wired to the bundled MP3.
- The 3D viewport is a WebView that will host a GLB via `model-viewer`.
- The GLB is not exported yet, so the viewer currently shows a placeholder card.

Next step:

1. Fix the center bone placement in PMX Editor or Blender.
2. Import the PMX + VMD into Blender with MMD Tools.
3. Export a single animated `.glb`.
4. Put that file under `assets/exports/` and update `src/assets.ts`.
