# 云朵农场 · 原创三维美术 V1.2 连接与五官精修测试版

当前分支为 `art-v1-test`，版本 `v0.23.1-art-fixes-test`。main / GitHub Pages 正式版保持 v0.18.0，未合并或覆盖。

- [模型互动预览](preview.html)
- [游戏测试入口](index.html)
- [资源说明、编辑方法与验收清单](docs/ART_V1.md)
- [验证记录](docs/validation.json)
- [八个主模型、三个 LOD 的 GLB / GLTF 与生成源码](assets/art-v1/)

本地用任意静态 HTTP 服务打开项目；不要直接双击 HTML，因为浏览器可能阻止模型 fetch。

```bash
python3 tools/build_art.py
node tests/art-v1.test.cjs
python3 tools/render_art.py
```

生成工具需要 Python 3、numpy、Pillow；游戏、模型预览和 Node 测试没有 npm 依赖。当前自动验证使用 Node VM 测试替身；真实手机浏览器、触摸手势和帧率待验收，详见说明。

![原创新模型](docs/previews/animals-v1-1.png)

## V1.2 更新（待手机验收）
- 主屋降低屋檐并补充墙体连接件，解决屋顶与房屋脱节感。
- 奶牛及低面数奶牛增加眼白、前移眼睛/高光，增加深入躯干的尾根连接网格。
- 同步保存修正版 GLB/GLTF、源代码、资源清单及导入缓存版本。
- 正式 main 仍是 v0.18.0；此分支手机帧率与触摸体验待实机验证。原 V1.1 ZIP 为旧档案，最新 GLB/GLTF 请从 assets/art-v1 获取。
