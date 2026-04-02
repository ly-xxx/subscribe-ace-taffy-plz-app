# Naiwa Expo Prototype

这个仓库现在走的是一条适合 Windows + Android 开发的路线：

- 用 Blender + `mmd_tools` 把 PMX 模型和 VMD 动作烘焙成一个可直接打包的 `GLB`
- 用 Expo 播放 MP3，并通过 `WebView + model-viewer` 展示本地 `GLB`
- 不在运行时直接执行 PMX/VMD

## 当前状态

- 已导出可用的 `GLB`：`assets/exports/taffy-laugh.glb`
- 已接入配乐：`assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.mp3`
- Expo 原型已经具备一个可操作的“狂笑播放台”
- 支持开播、暂停、归零、连播、分享文案
- 支持切换镜头机位和狂笑强度，并同步控制音频速率与模型动画速率
- 已保留 Blender 转换脚本，后续可以继续换模型、换动作再导出

## 为什么不用直接执行 MMD

对于这个仓库，`GLB` 比直接在 Expo 里跑 PMX/VMD 更稳：

- Expo 不能直接识别 PMX/VMD
- 直接跑 MMD 需要额外的原生渲染层或较重的 Web 兼容层，维护成本高
- `GLB` 更适合 Metro 打包、WebView 展示和后续移动端性能优化

如果后面我们要做“换装、换动作包、特效按钮、台词触发”，也完全可以继续基于这条 `MMD -> GLB -> Expo` 管线。

## 运行项目

```bash
npm install
npm start
```

如果已经连上 Android 真机，也可以直接：

```bash
npm run android
```

## 重新导出 GLB

当前仓库已经把转换流程脚本化，Windows 下直接运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\blender\convert-taffy.ps1
```

默认会读取：

- `assets/mmd/taffy_base/永雏塔菲MMD_2.0/永雏塔菲MMD_2.0.pmx`
- `assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.vmd`

然后输出到：

- `assets/exports/taffy-laugh.glb`

更多细节见 [docs/asset-pipeline.md](docs/asset-pipeline.md) 和 [tools/blender/README.md](tools/blender/README.md)。

## 当前已知问题

- VMD 导入时缺少不少 `Skirt_*` 骨骼，对裙摆细节有影响
- 也缺少一批当前模型并不存在的表情 morph，所以脸部不会完全还原原始 MMD
- 现在的 `GLB` 已经够做移动端原型，但还不是 1:1 的 MMD 完整复刻
- 当前 `WebView` 里的 `model-viewer` 运行脚本还是从 `unpkg` 加载，首次打开时需要网络；如果后面要做离线包或正式发布，建议把这部分改成仓库内本地资源
