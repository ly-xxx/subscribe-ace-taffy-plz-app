import json
import os
import sys
import traceback

import addon_utils
import bpy


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


def find_root_candidate():
    for obj in bpy.data.objects:
        if getattr(obj, "mmd_type", "") == "ROOT":
            return obj
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            return obj
    raise RuntimeError("No root candidate found")


def import_motion(vmd_path):
    root_candidate = find_root_candidate()
    bpy.ops.object.select_all(action="DESELECT")
    root_candidate.select_set(True)
    bpy.context.view_layer.objects.active = root_candidate
    bpy.ops.mmd_tools.import_vmd(
        filepath=vmd_path,
        scale=0.08,
        margin=0,
        bone_mapper="PMX",
        use_pose_mode=False,
        use_mirror=False,
        update_scene_settings=True,
        create_new_action=True,
        use_nla=False,
    )


def summarize_action(action):
    if action is None:
        return None

    fcurves = []
    for fcurve in action.fcurves:
        fcurves.append(
            {
                "data_path": fcurve.data_path,
                "array_index": fcurve.array_index,
                "keyframe_count": len(fcurve.keyframe_points),
                "frame_start": fcurve.range()[0] if len(fcurve.keyframe_points) else None,
                "frame_end": fcurve.range()[1] if len(fcurve.keyframe_points) else None,
            }
        )

    return {
        "name": action.name,
        "fcurve_count": len(action.fcurves),
        "frame_range": [float(action.frame_range[0]), float(action.frame_range[1])],
        "fcurves": fcurves,
    }


def summarize_shape_keys(obj):
    shape_keys = getattr(obj.data, "shape_keys", None)
    if shape_keys is None:
        return None

    animation_data = shape_keys.animation_data
    action = animation_data.action if animation_data else None

    drivers = []
    if animation_data and animation_data.drivers:
        for driver in animation_data.drivers:
            drivers.append(
                {
                    "data_path": driver.data_path,
                    "array_index": driver.array_index,
                    "expression": driver.driver.expression,
                    "variable_count": len(driver.driver.variables),
                }
            )

    return {
        "shape_key_names": [key_block.name for key_block in shape_keys.key_blocks],
        "action": summarize_action(action),
        "driver_count": len(drivers),
        "drivers": drivers,
    }


def summarize_object(obj):
    payload = {
        "name": obj.name,
        "type": obj.type,
        "mmd_type": getattr(obj, "mmd_type", ""),
    }

    if obj.animation_data and obj.animation_data.action:
        payload["object_action"] = summarize_action(obj.animation_data.action)

    if obj.type == "MESH":
        payload["shape_keys"] = summarize_shape_keys(obj)
        payload["material_count"] = len(obj.material_slots)
        payload["modifier_types"] = [modifier.type for modifier in obj.modifiers]

    return payload


def main():
    pmx_path = os.environ["NAIWA_PMX"]
    vmd_path = os.environ["NAIWA_VMD"]
    output_path = os.environ["NAIWA_INSPECT_OUT"]

    clear_scene()
    enable_mmd_tools()

    bpy.ops.mmd_tools.import_model(
        filepath=pmx_path,
        scale=0.08,
        rename_bones=False,
        use_mipmap=False,
    )

    import_motion(vmd_path)

    payload = {
        "objects": [summarize_object(obj) for obj in bpy.data.objects],
        "actions": [summarize_action(action) for action in bpy.data.actions],
    }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
