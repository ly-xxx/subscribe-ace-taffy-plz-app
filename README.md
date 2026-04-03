# 唐氏驾到

![唐氏驾到主视觉](docs/assets/hero-key-visual.jpg)

离线 MMD 舞台。模型、动作、配乐全部本地。持续进化中。

[下载 APK](https://github.com/ly-xxx/subscribe-ace-taffy-plz-app/releases) · [GitHub Pages](https://ly-xxx.github.io/subscribe-ace-taffy-plz-app/) · [构建说明](docs/release-build.md) · [资产管线](docs/asset-pipeline.md)

## 特点

- 离线运行：`GLB`、动作、配乐都随包分发
- Android 优先：Windows + Android Studio 即可本地构建
- 稳定路线：`Expo / React Native + WebView + vendored model-viewer`
- 资产前置：`PMX / VMD -> Blender -> GLB -> App`

## 本地运行

安装依赖：

```bash
npm install
```

启动 Android：

```bash
npm run android
```

只看 Web 预览：

```bash
npm run web
```

## 构建

Debug APK：

```powershell
npm run build:debug:apk
```

Release APK：

```powershell
npm run build:release:apk
```

Release AAB：

```powershell
npm run build:release:aab
```

默认输出：

```text
android/app/build/outputs/apk/release/app-release.apk
```

如果没有配置 `NAIWA_UPLOAD_*`，`release` 构建会回退到 debug keystore。这适合测试分发，不适合直接上架 Google Play。

## 资产转换

转换当前塔菲资产：

```powershell
npm run convert:taffy
```

检查当前导出的 `GLB`：

```bash
npm run inspect:glb
```

更多说明：

- [docs/asset-pipeline.md](docs/asset-pipeline.md)
- [tools/blender/README.md](tools/blender/README.md)

## 发布流程

1. 推送 `main`，GitHub Pages 自动更新落地页。
2. 推送 `v*` tag，GitHub Actions 自动构建并发布 `APK / AAB`。
3. Pages 首页会自动读取最新 Release，更新下载按钮与版本信息。

例如：

```powershell
git tag v1.0.0
git push origin v1.0.0
```

## 项目结构

- `App.tsx`：应用入口
- `src/modelViewerHtml.ts`：离线 WebView / model-viewer 舞台
- `src/showConfig.ts`：动作、镜头、配乐配置
- `assets/exports/`：导出的 `GLB` 资源
- `docs/`：GitHub Pages 站点
- `scripts/`：本地构建脚本

## 当前状态

- Android 包名：`io.github.ly_xxx.tangshijiadao`
- 当前路线适合真机体验、GitHub Releases 分发和 Play 前期验证
- 上架 Google Play 前仍然需要正式 keystore 和正式签名产物
