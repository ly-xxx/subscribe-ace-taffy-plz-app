import os
import sys
import traceback

import bpy
import addon_utils
from mathutils import Vector


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


def move_center_bone_to_hip(armature_obj):
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.mode_set(mode="EDIT")

    edit_bones = armature_obj.data.edit_bones
    center = edit_bones.get("センター")
    lower = edit_bones.get("下半身")
    left_leg = edit_bones.get("左足")
    right_leg = edit_bones.get("右足")

    if center is None:
        raise RuntimeError("Could not find センター bone")

    candidate_points = []
    for bone in [left_leg, right_leg]:
        if bone is not None:
            candidate_points.append(bone.head.copy())
    if not candidate_points and lower is not None:
        candidate_points.append(lower.head.copy())

    if not candidate_points:
        raise RuntimeError("Could not find hip-related bones to reposition センター")

    target = sum(candidate_points, Vector((0.0, 0.0, 0.0))) / len(candidate_points)
    bone_vector = center.tail - center.head
    if bone_vector.length == 0:
        bone_vector = Vector((0.0, 0.1, 0.0))

    center.head = target
    center.tail = target + bone_vector

    bpy.ops.object.mode_set(mode="OBJECT")


def import_motion(vmd_path):
    root_candidate = None
    for obj in bpy.data.objects:
        if hasattr(obj, "mmd_type") and getattr(obj, "mmd_type", "") == "ROOT":
            root_candidate = obj
            break

    if root_candidate is None:
        root_candidate = find_armature()

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


def set_scene_frame_range():
    frame_end = 1
    for action in bpy.data.actions:
        if action.frame_range[1] > frame_end:
            frame_end = int(action.frame_range[1])
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = frame_end
    bpy.context.scene.render.fps = 30


def export_glb(output_path):
    armature_obj = find_armature()
    export_objects = [armature_obj]

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if any(mod.type == "ARMATURE" and mod.object == armature_obj for mod in obj.modifiers):
            export_objects.append(obj)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_image_format="AUTO",
        export_yup=True,
    )


def main():
    pmx_path = os.environ["NAIWA_PMX"]
    vmd_path = os.environ["NAIWA_VMD"]
    glb_path = os.environ["NAIWA_GLB_OUT"]

    clear_scene()
    enable_mmd_tools()

    bpy.ops.mmd_tools.import_model(
        filepath=pmx_path,
        scale=0.08,
        rename_bones=False,
        use_mipmap=False,
    )

    armature_obj = find_armature()
    move_center_bone_to_hip(armature_obj)
    import_motion(vmd_path)
    set_scene_frame_range()
    export_glb(glb_path)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
