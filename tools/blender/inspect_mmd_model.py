import json
import os
import sys
import traceback

import bpy
import addon_utils


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablock_collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.armatures,
        bpy.data.actions,
        bpy.data.images,
    ):
        for datablock in list(datablock_collection):
            if datablock.users == 0:
                datablock_collection.remove(datablock)


def enable_mmd_tools():
    addon_utils.enable("mmd_tools", default_set=True, persistent=True)
    if not addon_utils.check("mmd_tools")[1]:
        raise RuntimeError("mmd_tools addon is not enabled")


def find_armature():
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            return obj
    raise RuntimeError("No armature object was imported")


def main():
    pmx_path = os.environ["NAIWA_PMX"]
    output_path = os.environ["NAIWA_INSPECT_OUT"]

    clear_scene()
    enable_mmd_tools()

    bpy.ops.mmd_tools.import_model(
        filepath=pmx_path,
        scale=0.08,
        rename_bones=False,
        use_mipmap=False,
    )

    armature_obj = find_armature()
    bones = armature_obj.data.bones

    key_bones = {}
    for name in ["センター", "下半身", "上半身", "左足", "右足", "左ひざ", "右ひざ"]:
        bone = bones.get(name)
        if bone is not None:
            key_bones[name] = {
                "head_local": list(bone.head_local),
                "tail_local": list(bone.tail_local),
            }

    payload = {
        "armature_name": armature_obj.name,
        "bone_count": len(bones),
        "bone_names": [bone.name for bone in bones],
        "key_bones": key_bones,
    }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
