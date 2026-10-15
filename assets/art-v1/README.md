# Cloud Farm original art V1.3

Eight editable primary models and three animal LOD meshes; all glTF 2.0 models, Y-up / +Z front. Open GLB in Blender and edit named mesh nodes. GLTF variants embed their binary buffers. No textures or downloaded third-party assets.

The source is `../../tools/build_art.py` and `../../tools/animal_shapes.py`. Cow markings are thin conformal surfaces with clean continuous boundaries, rather than raised ball primitives. Detailed editing, adapter limits and testing notes: `../../docs/ART_V1.md`. `manifest.json` records exact bounds, triangle counts and file sizes.

Apple fruit, stems and leaves use node names beginning `fruit-`; the game hides that group until harvest time. Static meshes only, no skeleton/animation in V1.2. Existing game movement remains active.

Authorship/provenance: meshes designed specifically for Gky666-cell/cloud-farm-3d; generated using the included original geometric source. No third-party model license dependency is introduced. A general repository license has not been selected by the owner.

## V1.2 structural corrections
The farm house roof slopes now meet the walls at the eaves and include two named roof-wall connector meshes. Both cow LODs add visible ivory sclera meshes and forward pupils/highlights; the tail has a tapered root penetrating the rump. Source generators and editable GLB/embedded GLTF variants were updated together. No change to the existing save format.

## New buildings in V1.3
Six independently-editable static low-poly buildings (`coop-house`, `cow-barn`, `sheep-barn`, `workshop-house`, `windmill`, `well`) are generated from `../../tools/build_buildings.cjs` with Node.js. Every building has a GLB file plus an embedded-buffer GLTF. The entire library now has 17 main/LOD files per format. See `../../docs/BUILDINGS_V1_3.md` for details; the archived V1.1 ZIP is not up to date.


## v0.25.0 体验迭代

精修 GLB/GLTF 和生成源码保持原样；当前体验分支为 `experience-v0.25.0`。游戏增加命名部件步态、地面接触、场景取景和交互修复，并已进行真实桌面浏览器经营流程验收。完整记录、限制和公开入口见 [v0.25.0 说明](../../docs/EXPERIENCE_V0_25.md)。本文前面的 v0.24.x 数字和验收边界为历史版本记录。
