# 唐氏驾到

![唐氏驾到主视觉](docs/assets/hero-key-visual.jpg)

离线 MMD 舞台 for Android。模型、动作、配乐都打包在本地，打开就开演。

[GitHub Pages](https://ly-xxx.github.io/subscribe-ace-taffy-plz-app/) · [GitHub Releases](https://github.com/ly-xxx/subscribe-ace-taffy-plz-app/releases) · [构建说明](docs/release-build.md)

## 现在是什么

- 面向 Android 的离线 MMD 展示 App
- `GLB + 本地音频 + vendored model-viewer`
- `Expo / React Native + WebView` 的稳定分发路线
- Windows 本地可直接构建 `debug APK`、`release APK`、`release AAB`
- GitHub Pages 负责展示，GitHub Releases 负责下载

## 技术路线

```text
PMX / VMD
  -> Blender + mmd_tools
  -> GLB
  -> Expo / React Native
  -> WebView + 本地 model-viewer
```

项目当前不在运行时直接解析 `PMX / VMD`，而是把复杂度前置到资产转换阶段，换取更稳的移动端播放、离线分发和后续迭代空间。

## 快速开始

安装依赖：

```bash
npm install
```

连接 Android 真机后启动：

```bash
npm run android
```

只预览 Web：

```bash
npm run web
```

## 构建

Debug APK：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-debug-apk.ps1
```

Release APK：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1
```

Release AAB：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-aab.ps1
```

默认输出：

```text
android/app/build/outputs/apk/release/app-release.apk
```

如果没有配置 `NAIWA_UPLOAD_*`，`release` 构建会回退到 debug keystore。这适合测试和体验分发，不适合直接上架 Google Play。

## 资产转换

一键转换当前塔菲资产：

```powershell
npm run convert:taffy
```

检查当前导出的 `GLB`：

```bash
npm run inspect:glb
```

更多文档：

- [docs/asset-pipeline.md](docs/asset-pipeline.md)
- [tools/blender/README.md](tools/blender/README.md)

## 分发

- 推送 `main` 后，GitHub Pages 会自动更新落地页
- 推送 `v*` tag 后，GitHub Actions 会自动构建并发布最新 `APK / AAB`
- Pages 首页会自动读取最新 GitHub Release，直接更新下载按钮

例如：

```powershell
git tag v1.0.0
git push origin v1.0.0
```

## 目录

- [App.tsx](App.tsx)：应用入口
- [src/modelViewerHtml.ts](src/modelViewerHtml.ts)：离线 WebView / model-viewer 桥接
- [src/showConfig.ts](src/showConfig.ts)：动作、镜头、配乐等配置
- [assets/exports](assets/exports)：导出的 `GLB` 资源
- [docs](docs)：GitHub Pages 落地页
- [scripts](scripts)：本地构建脚本

## 当前状态

- Android 包名：`io.github.ly_xxx.tangshijiadao`
- 当前路线适合真机体验、GitHub Releases 分发和 Play 前期验证
- 真正上架 Google Play 前，仍然需要正式 keystore 和正式签名产物
