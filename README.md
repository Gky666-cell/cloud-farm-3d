# 云朵农场 · v0.25.1 玩家反馈优化测试版

当前分支为 `experience-v0.25.0`，基于 `art-v1-test` 最新提交 `b1f5043`，版本 `v0.25.1-feedback-test`。main / GitHub Pages 正式版保持 v0.18.0，未合并或覆盖。

- [本轮动物比例、步态与玉米彩线修复](docs/FEEDBACK_V0_25_1.md)
- [5 项反馈回归](docs/feedback-validation.json)
- [模型互动预览](preview.html)
- [游戏测试入口](index.html)
- [资源说明、编辑方法与验收清单](docs/ART_V1.md)
- [本轮修复、真实浏览器验收与本地运行](docs/EXPERIENCE_V0_25.md)
- [验证记录](docs/validation.json)
- [17 项体验回归](docs/experience-validation.json)
- [全部 17 个 GLB / GLTF 与生成源码](assets/art-v1/)

本地用任意静态 HTTP 服务打开项目；不要直接双击 HTML，因为浏览器可能阻止模型 fetch。

```bash
python3 tools/build_art.py --animals-only
node tests/art-v1.test.cjs
node tests/experience-v025.test.cjs
node tests/feedback-v0251.test.cjs
python3 tools/check_animal_repro.py
python3 tools/render_art.py
```

生成工具需要 Python 3、numpy、Pillow；游戏、模型预览和 Node 测试没有 npm 依赖。自动验证使用 Node VM 测试替身；已另行进行桌面 Chromium 的真实 WebGL 与完整经营流程验收，物理手机触控和帧率仍待验收，详见本轮说明。

![原创新模型](docs/previews/animals-v1-1.png)

## 🖥️ 电脑版直接测试（v0.25.1）

- [电脑打开完整农场游戏](https://raw.githack.com/Gky666-cell/cloud-farm-3d/experience-v0.25.0/index.html)
- [旋转预览全部原创 3D 模型](https://raw.githack.com/Gky666-cell/cloud-farm-3d/experience-v0.25.0/preview.html)
- [电脑操作、验收步骤和故障排查](docs/PC_TEST.md)

支持鼠标拖动、滚轮缩放、WASD / 方向键平移、R 复位、M 菜单、B 仓库、Esc 返回。公开预览通过第三方 CDN 提供，首次可能需要确认；此分支测试存档仍与正式版隔离。GitHub Actions 自动验证不代表已经进行真实浏览器人工验收。

## V1.2 更新（待手机验收）
- 主屋降低屋檐并补充墙体连接件，解决屋顶与房屋脱节感。
- 奶牛及低面数奶牛增加眼白、前移眼睛/高光，增加深入躯干的尾根连接网格。
- 同步保存修正版 GLB/GLTF、源代码、资源清单及导入缓存版本。
- 正式 main 仍是 v0.18.0；此分支手机帧率与触摸体验待实机验证。原 V1.1 ZIP 为旧档案，最新 GLB/GLTF 请从 assets/art-v1 获取。

## V1.3 建筑包与场景改进
已新增六个原创 GLB/GLTF：鸡舍、牛棚、羊圈、加工坊、风车、水井；同步到主岛与独立牧场（或鸡舍）场景。源文件在 `tools/build_buildings.cjs`，细节参见 [原创建筑 V1.3 说明](docs/BUILDINGS_V1_3.md)。原 V1.1 ZIP 为历史归档。正式分支不更改。

## v0.25.0 本轮体验修复

修复弯折播种误触、建筑空白角命中、动物放养跳变、脚部落地和转向、升级产量数字、生产面板到时刷新、菜单排版及宽屏取景。全部精修 GLB/GLTF、LOD、七场景和测试存档保持可用。18 项原有回归与 17 项新增回归通过。新 Draft PR 以 `art-v1-test` 为目标，等待人工验收；没有合并 main。

### 六座原创建筑实物模型总览
![原创建筑模型 GLB 网格预览](docs/previews/buildings-v1-3.svg)
