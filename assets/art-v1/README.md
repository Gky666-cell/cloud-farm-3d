# Cloud Farm original art V1.1

Eight editable primary models and three animal LOD meshes; all glTF 2.0 models, Y-up / +Z front. Open GLB in Blender and edit named mesh nodes. GLTF variants embed their binary buffers. No textures or downloaded third-party assets.

The source is `../../tools/build_art.py` and `../../tools/animal_shapes.py`. Cow markings are thin conformal surfaces with clean continuous boundaries, rather than raised ball primitives. Detailed editing, adapter limits and testing notes: `../../docs/ART_V1.1.md`. `manifest.json` records exact bounds, triangle counts and file sizes.

Apple fruit, stems and leaves use node names beginning `fruit-`; the game hides that group until harvest time. Static meshes only, no skeleton/animation in V1.1. Existing game movement remains active.

Authorship/provenance: meshes designed specifically for Gky666-cell/cloud-farm-3d; generated using the included original geometric source. No third-party model license dependency is introduced. A general repository license has not been selected by the owner.
