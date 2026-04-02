# Blender Workflow Notes

This project does not run PMX or VMD directly at runtime.

The expected workflow is:

1. Fix the `センター` bone position using PMX Editor or Blender.
2. Install **MMD Tools** in Blender 4.2+ / 5.x.
3. Import the PMX model.
4. Import the VMD motion.
5. Check the timing against `关注塔菲谢谢喵.mp3`.
6. Export a single animated `GLB`.
7. Copy that GLB to `assets/exports/taffy-laugh.glb`.

Useful references:

- MMD Tools repo: https://github.com/MMD-Blender/blender_mmd_tools
- MMD Tools wiki: https://mmd-blender.fandom.com/wiki/MMD_Tools

After export, update `src/assets.ts` to point to the new GLB.
