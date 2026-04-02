import os
import sys
import traceback

import bpy
import addon_utils
from mathutils import Vector


def capture_material_settings(material):
    alpha_threshold = getattr(material, "alpha_threshold", 0.5)
    blend_method = getattr(material, "blend_method", "OPAQUE")
    use_backface_culling = getattr(material, "use_backface_culling", False)

    return {
        "blend_method": blend_method,
        "alpha_threshold": alpha_threshold,
        "use_backface_culling": use_backface_culling,
    }


def restore_material_settings(material, settings):
    blend_method = settings["blend_method"]
    if blend_method == "HASHED":
        # glTF has no hashed transparency; alpha clip is the closest stable mobile-friendly equivalent.
        blend_method = "CLIP"

    if hasattr(material, "blend_method"):
        material.blend_method = blend_method

    if hasattr(material, "alpha_threshold"):
        material.alpha_threshold = settings["alpha_threshold"]

    if hasattr(material, "use_backface_culling"):
        material.use_backface_culling = settings["use_backface_culling"]


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


def convert_mmd_materials():
    from mmd_tools import cycles_converter

    material_settings = {}
    for material in bpy.data.materials:
        material_settings[material.name] = capture_material_settings(material)

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if not any(mod.type == "ARMATURE" for mod in obj.modifiers):
            continue
        if not obj.material_slots:
            continue

        cycles_converter.convertToBlenderShader(
            obj,
            use_principled=True,
            clean_nodes=True,
            subsurface=0.0,
        )

    for material in bpy.data.materials:
        settings = material_settings.get(material.name)
        if settings is None:
            continue

        restore_material_settings(material, settings)


def find_armature():
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            return obj
    raise RuntimeError("No armature object was imported")


def find_root_object():
    for obj in bpy.data.objects:
        if hasattr(obj, "mmd_type") and getattr(obj, "mmd_type", "") == "ROOT":
            return obj
    return find_armature()


def collect_hierarchy(root_obj):
    collected = []
    stack = [root_obj]

    while stack:
        current = stack.pop()
        if current in collected:
            continue
        collected.append(current)
        stack.extend(list(current.children))

    return collected


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


def import_motion(vmd_path, create_new_action):
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
        create_new_action=create_new_action,
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


def smooth_animation_curves():
    for action in bpy.data.actions:
        for fcurve in action.fcurves:
            for keyframe in fcurve.keyframe_points:
                keyframe.interpolation = "BEZIER"
                if hasattr(keyframe, "handle_left_type"):
                    keyframe.handle_left_type = "AUTO_CLAMPED"
                if hasattr(keyframe, "handle_right_type"):
                    keyframe.handle_right_type = "AUTO_CLAMPED"
            fcurve.update()


def build_triangle_positions(instance_count, spacing_x=0.88, spacing_z=0.8):
    if instance_count < 1:
        raise RuntimeError("Instance count must be at least 1")

    row_count = 0
    accumulated = 0
    while accumulated < instance_count:
        row_count += 1
        accumulated += row_count

    if accumulated != instance_count:
        raise RuntimeError(
            f"Unsupported instance count {instance_count}. Use triangular counts such as 1, 3, 6, or 10."
        )

    positions = []
    for row_index in range(row_count):
        row_size = row_index + 1
        z = (row_index - (row_count - 1) * 0.5) * spacing_z
        row_width = (row_size - 1) * spacing_x
        for column in range(row_size):
            x = column * spacing_x - row_width * 0.5
            positions.append(Vector((x, 0.0, z)))

    return positions


def duplicate_stage_instances(instance_count):
    if instance_count <= 1:
        return

    root_obj = find_root_object()
    hierarchy = collect_hierarchy(root_obj)
    known_names = {obj.name for obj in bpy.data.objects}
    positions = build_triangle_positions(instance_count)
    root_obj.location = positions[0]

    for position in positions[1:]:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in hierarchy:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = root_obj
        bpy.ops.object.duplicate(linked=True)

        new_objects = [obj for obj in bpy.data.objects if obj.name not in known_names]
        if not new_objects:
            raise RuntimeError("Failed to duplicate the MMD hierarchy for multi-instance export")

        known_names.update(obj.name for obj in new_objects)
        duplicate_root = next(
            (
                obj
                for obj in new_objects
                if hasattr(obj, "mmd_type") and getattr(obj, "mmd_type", "") == "ROOT"
            ),
            None,
        )
        if duplicate_root is None:
            duplicate_root = next((obj for obj in new_objects if obj.type == root_obj.type), None)

        if duplicate_root is None:
            raise RuntimeError("Could not find duplicated root object for multi-instance export")

        duplicate_root.location = position


def export_glb(output_path):
    armature_obj = find_armature()
    export_objects = [
        obj for obj in bpy.data.objects if obj.type in {"ARMATURE", "MESH", "EMPTY"}
    ]

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
        export_morph=True,
        export_morph_animation=True,
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_image_format="AUTO",
        export_yup=True,
    )


def main():
    pmx_path = os.environ["NAIWA_PMX"]
    vmd_path = os.environ["NAIWA_VMD"]
    glb_path = os.environ["NAIWA_GLB_OUT"]
    instance_count = int(os.environ.get("NAIWA_INSTANCE_COUNT", "1"))
    extra_vmd_paths = [
        path for path in os.environ.get("NAIWA_EXTRA_VMD", "").split(os.pathsep) if path
    ]

    clear_scene()
    enable_mmd_tools()

    bpy.ops.mmd_tools.import_model(
        filepath=pmx_path,
        scale=0.08,
        rename_bones=False,
        use_mipmap=False,
    )

    convert_mmd_materials()

    armature_obj = find_armature()
    move_center_bone_to_hip(armature_obj)
    import_motion(vmd_path, create_new_action=True)
    for extra_vmd_path in extra_vmd_paths:
        import_motion(extra_vmd_path, create_new_action=False)
    smooth_animation_curves()
    duplicate_stage_instances(instance_count)
    set_scene_frame_range()
    export_glb(glb_path)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
