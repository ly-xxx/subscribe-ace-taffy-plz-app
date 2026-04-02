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


def linked_image_names(material):
    image_names = []
    if not material.use_nodes or material.node_tree is None:
        return image_names

    for node in material.node_tree.nodes:
        if getattr(node, "type", "") == "TEX_IMAGE" and getattr(node, "image", None) is not None:
            image_names.append(node.image.name)

    return image_names


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
    meshes = []
    materials = []

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue

        shape_keys = []
        if obj.data.shape_keys and obj.data.shape_keys.key_blocks:
            shape_keys = [key_block.name for key_block in obj.data.shape_keys.key_blocks]

        mesh_materials = []
        for slot in obj.material_slots:
            if slot.material is not None:
                mesh_materials.append(slot.material.name)

        meshes.append(
            {
                "name": obj.name,
                "vertex_count": len(obj.data.vertices),
                "shape_key_count": len(shape_keys),
                "shape_keys": shape_keys,
                "materials": mesh_materials,
            }
        )

    for material in bpy.data.materials:
        materials.append(
            {
                "name": material.name,
                "blend_method": getattr(material, "blend_method", None),
                "shadow_method": getattr(material, "shadow_method", None),
                "use_backface_culling": getattr(material, "use_backface_culling", None),
                "images": linked_image_names(material),
            }
        )

    payload = {
        "armature_name": armature_obj.name,
        "mesh_count": len(meshes),
        "meshes": meshes,
        "material_count": len(materials),
        "materials": materials,
    }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
