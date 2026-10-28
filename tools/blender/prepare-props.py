"""Prepare the furniture models the site loads.

Usage (from the repository root):
    blender -b --factory-startup --python tools/blender/prepare-props.py

The downloads in tools/blender/source/props-source are imported and written again,
still Draco-compressed, to public/assets/models/props. The site decodes them with three.js's DRACOLoader.
The coffee mug also loses its steam, and the television's screen is set back almost flush with its bezel.
Faces stay flat-shaded with their vertex colours.
"""

from pathlib import Path

import bmesh
import bpy

REPO = Path(__file__).resolve().parents[2]
SOURCE = REPO / "tools/blender/source/props-source"
OUTPUT = REPO / "public/assets/models/props"
MODELS = (
    "bench-01",
    "bookshop-book-stack",
    "bookshop-floor-plant",
    "cloud-set-01",
    "coffee-mug",
    "cypress-tree",
    "dining-sideboard",
    "dining-area-rug",
    "dining-wall-art",
    "family-sedan",
    "keyboard",
    "monitor",
    "office-wall-shelves",
    "sofa-3seat",
    "tall-bookcase",
    "tall-cabinet",
    "tree-oak-01",
    "tv-flatscreen",
    "wine-rack",
)


def parts_of(bm):
    seen, parts = set(), []
    for face in bm.faces:
        if face in seen:
            continue
        stack, part = [face], []
        seen.add(face)
        while stack:
            current = stack.pop()
            part.append(current)
            for edge in current.edges:
                for other in edge.link_faces:
                    if other not in seen:
                        seen.add(other)
                        stack.append(other)
        parts.append(part)
    return parts


def remove_steam(mesh):
    """Delete every part reaching above the mug's rim. The mesh is split per triangle, so parts are found on welded vertices."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    parts = sorted(parts_of(bm), key=len, reverse=True)
    rim = max(v.co.z for f in parts[0] for v in f.verts)
    steam = [part for part in parts[1:] if max(v.co.z for f in part for v in f.verts) > rim + 0.002]
    bmesh.ops.delete(bm, geom=[f for part in steam for f in part], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    print("  removed %d steam parts" % len(steam))


# The television's screen stands 40 mm proud of the bezel's front (at y = -0.025), which reads as a slab stuck
# on the set when seen from the side. Its front is set back to 2 mm proud of the bezel, as on a flat panel.
# Only the screen comes forward of y = -0.04 above the stand's neck (which reaches z = -0.25).
SCREEN_FRONT = -0.027


def flush_screen(obj):
    """Move the television screen's front face back to SCREEN_FRONT (Blender space: the set faces -Y)."""
    to_world = obj.matrix_world
    moved = 0
    for vertex in obj.data.vertices:
        point = to_world @ vertex.co
        if point.y < -0.04 and point.z > -0.24:
            point.y = SCREEN_FRONT
            vertex.co = to_world.inverted() @ point
            moved += 1
    print("  set back %d screen vertices" % moved)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name in MODELS:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(SOURCE / (name + ".glb")))
        if name == "coffee-mug":
            remove_steam(next(o for o in bpy.data.objects if o.type == "MESH").data)
        if name == "tv-flatscreen":
            flush_screen(next(o for o in bpy.data.objects if o.type == "MESH"))
        target = OUTPUT / (name + ".glb")
        bpy.ops.export_scene.gltf(
            filepath=str(target),
            export_format="GLB",
            export_draco_mesh_compression_enable=True,
            export_vertex_color="ACTIVE",
            export_cameras=False,
            export_lights=False,
        )
        print("Exported", target.name, target.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
