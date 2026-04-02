# Naiwa Expo Prototype

这个仓库现在走的是一条适合 Windows + Android 开发的路线：

- 用 Blender + `mmd_tools` 把 PMX 模型和 VMD 动作烘焙成一个可直接打包的 `GLB`
- 用 Expo 播放 MP3，并通过离线 `WebView + model-viewer` 展示本地 `GLB`
- 在运行时桥接 `model-viewer` 内部 three 场景，补做表情 morph 和材质遮挡修正
- 不在运行时直接执行 PMX/VMD

## 当前状态

- 已导出可用的 `GLB`：`assets/exports/taffy-laugh.glb`
- 已接入配乐：`assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.mp3`
- Expo 原型已经改成接近奶蛙的单屏白底舞台页
- 支持开播、暂停、归零、连播、分享配置
- 支持切换镜头机位、狂笑强度和表情预设，并同步控制音频速率与模型动画速率
- `model-viewer` 已经 vendoring 到仓库内，首次打开不再依赖 `unpkg`
- `GLB` 导出后会自动做一次材质模式修正，尽量缓解头发/脸/饰品的遮挡错乱
- 当前这份塔菲模型已经确认带有 56 个可桥接的 morph target
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

如果要在本机直接产出可安装的 debug APK，可以运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-debug-apk.ps1
```

如果要直接打 `release APK`，现在仓库里已经提供了可用脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1
```

输出文件在：

```text
android/app/build/outputs/apk/release/app-release.apk
```

没有正式证书时，`release` 会回退到 debug keystore 做体验包；准备好 keystore 以后，可以按 [docs/release-build.md](docs/release-build.md) 里的方式切正式签名。

## GitHub Pages Landing Page

仓库里已经内置了一套可直接部署的静态站点：

- `docs/index.html`
- `docs/styles.css`
- `docs/script.js`
- `.github/workflows/deploy-pages.yml`
- `.github/workflows/build-android.yml`

如果你把仓库推到 GitHub：

1. 启用 Actions / Pages
2. 推送 `master`
3. 工作流会自动把 `docs/` 发布到 GitHub Pages

如果你想直接在 GitHub 上产出 APK，也可以在 `Actions` 里运行 `Build Android APK`，成功后会把 `release apk` 作为 artifact 提供下载。

最终地址通常是：

```text
https://<github-username>.github.io/<repo-name>/
```

## 重新导出 GLB

当前仓库已经把转换流程脚本化，Windows 下直接运行：

```powershell
npm run convert:taffy
```

默认会读取：

- `assets/mmd/taffy_base/永雏塔菲MMD_2.0/永雏塔菲MMD_2.0.pmx`
- `assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.vmd`

然后输出到：

- `assets/exports/taffy-laugh.glb`

导出完成后，还会自动执行一层 `GLB` 后处理：

- 把大部分发丝/脸部/饰品材质从全局 `BLEND` 修正为更适合移动端的 `MASK` / `OPAQUE`
- 保留 `Dark+Water` 这种确实需要透明混合的材质

如果你想检查当前导出的材质模式和 morph 数量，可以运行：

```bash
npm run inspect:glb
```

更多细节见 [docs/asset-pipeline.md](docs/asset-pipeline.md) 和 [tools/blender/README.md](tools/blender/README.md)。

## 当前已知问题

- VMD 导入时缺少不少 `Skirt_*` 骨骼，对裙摆细节有影响
- 动作文件里仍然缺少一批当前模型并不存在的表情 morph，所以脸部不会完全还原原始 MMD
- 当前这条 `Expo + model-viewer` 路线已经能做出可看的 Android debug 原型，但要做到真正高端的实时五官控制和完全稳定的遮挡，仍然更适合迁到自定义 three / 原生渲染层
- 当前 vendored 的 `model-viewer` 是一个内联 UMD 脚本，包体会比在线脚本模式更大一些，但离线稳定性更好
