# Cloud Farm original art V1.2

Eight editable primary models and three animal LOD meshes; all glTF 2.0 models, Y-up / +Z front. Open GLB in Blender and edit named mesh nodes. GLTF variants embed their binary buffers. No textures or downloaded third-party assets.

The source is `../../tools/build_art.py` and `../../tools/animal_shapes.py`. Cow markings are thin conformal surfaces with clean continuous boundaries, rather than raised ball primitives. Detailed editing, adapter limits and testing notes: `../../docs/ART_V1.2.md`. `manifest.json` records exact bounds, triangle counts and file sizes.

Apple fruit, stems and leaves use node names beginning `fruit-`; the game hides that group until harvest time. Static meshes only, no skeleton/animation in V1.2. Existing game movement remains active.

Authorship/provenance: meshes designed specifically for Gky666-cell/cloud-farm-3d; generated using the included original geometric source. No third-party model license dependency is introduced. A general repository license has not been selected by the owner.

## V1.2 structural corrections
The farm house roof slopes now meet the walls at the eaves and include two named roof-wall connector meshes. Both cow LODs add visible ivory sclera meshes and forward pupils/highlights; the tail has a tapered root penetrating the rump. Source generators and editable GLB/embedded GLTF variants were updated together. No change to the existing save format.
