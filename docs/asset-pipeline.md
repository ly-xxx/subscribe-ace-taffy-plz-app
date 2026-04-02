# MMD Asset Pipeline

## What we have

- `assets/mmd/taffy_base/永雏塔菲MMD_2.0/永雏塔菲MMD_2.0.pmx`
- `assets/mmd/taffy_base/永雏塔菲MMD_2.0/tex/*.png`
- `assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.vmd`
- `assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.mp3`

## Constraint from the motion author

The motion pack says:

- Move the model's `センター` bone to the hip/crotch area before applying the VMD.
- Use `センター骨位置示例.png` as reference.

If this step is skipped, the motion will likely drift or deform incorrectly.

## Recommended conversion path

1. Open the PMX in PMX Editor and correct the `センター` bone.
2. Import the fixed PMX into Blender with MMD Tools.
3. Import the VMD in Blender and verify timing.
4. Export to animated `GLB`.
5. Copy the exported file to `assets/exports/taffy-laugh.glb`.
6. Update `src/assets.ts`:

```ts
export const modelGlbModule = require('../assets/exports/taffy-laugh.glb');
```

## Why GLB

Expo cannot use PMX/VMD directly at runtime.

`GLB` gives us:

- one file for model + textures + animation
- easy bundling in Metro
- direct playback in `model-viewer`
- a cleaner path for future migration to native 3D if needed
