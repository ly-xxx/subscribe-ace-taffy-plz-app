# 唐氏驾到

一个面向 Android 的离线 MMD 舞台项目。

这套仓库的目标很直接：在 `Windows + Android` 环境里，把 MMD 模型、动作和音乐整理成一个能直接安装、能继续迭代、能逐步走向正式发布的 App。当前路线不是在运行时直接执行 `PMX/VMD`，而是先把资产转换成适合移动端分发的 `GLB`，再由 Expo 壳和本地 `WebView + model-viewer` 完成展示与控制。

## 现在能做什么

- Android 真机运行与调试
- 本地 `GLB` 模型播放
- 本地音频播放
- 仓库内 vendored `model-viewer`，不依赖在线 CDN
- 轻量 `toon-lite` 风格化渲染
- Windows 下直接产出 `debug APK`
- Windows / GitHub Actions 下产出 `release APK`
- Windows / GitHub Actions 下产出 `release AAB`
- GitHub Pages 落地页
- 保留 Blender 转换链路，后续可以继续换模型、换动作、换音乐

## 项目路线

当前仓库走的是一条偏稳、偏工程化的 Android 路线：

`PMX / VMD -> Blender + mmd_tools -> GLB -> Expo / React Native -> WebView + 本地 model-viewer`

这条路线的重点是：

- 不在运行时直接解析 `PMX/VMD`
- 尽量把复杂度前置到资产转换阶段
- 让最终安装包可以离线工作
- 保留后续迁移到自定义渲染层的空间

## 快速开始

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm start
```

连接 Android 真机后直接安装运行：

```bash
npm run android
```

如果你只想本地预览 Web 版本：

```bash
npm run web
```

## 构建 APK

本地 debug 包：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-debug-apk.ps1
```

本地 release 包：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1
```

默认输出路径：

```text
android/app/build/outputs/apk/release/app-release.apk
```

当前 release 构建的默认特性：

- 默认只打 `arm64-v8a`
- 未配置正式 keystore 时，会回退到 debug keystore
- 这种 release APK 适合真机测试和体验分发
- 这种 release APK 不适合直接上架 Google Play

正式签名、环境变量和更多细节见 [docs/release-build.md](docs/release-build.md)。

## 资产转换

当前仓库不会在运行时直接播 `PMX/VMD`，而是先导出 `GLB`。

一键转换命令：

```powershell
npm run convert:taffy
```

导出后检查当前 `GLB`：

```bash
npm run inspect:glb
```

更多说明：

- [docs/asset-pipeline.md](docs/asset-pipeline.md)
- [tools/blender/README.md](tools/blender/README.md)

## 分发建议

如果你的目标是“先尽快把包发出去”，推荐顺序如下。

| 场景 | 方案 | 为什么 |
| --- | --- | --- |
| 最快发给熟人安装 | GitHub Releases | 零门槛，直接上传 APK，当下载页用就行 |
| 更像正式测试平台 | Firebase App Distribution | 有测试者管理、邮件邀请、版本通知，适合小范围持续测试 |
| 先走 Google 官方渠道分发测试包 | Google Play Internal testing / Internal app sharing | 依旧很快，但更贴近后续 Play 发布流程 |
| 真正公开上架到 Play 商店 | Google Play Production | 最正规，但也最慢，前置要求最多 |

### 当前最推荐的两条路

#### 1. 先发体验包

如果你只是想先给别人装：

- 直接把 APK 放到 GitHub Releases
- 或者接 Firebase App Distribution

这两条都比“立刻上 Play 正式公开”更快。

#### 2. 先走 Google 官方测试轨道

如果你想尽快进入 Google 体系，但还不追求公开上架：

- 优先考虑 `Internal testing`
- 或者更轻量的 `Internal app sharing`

这两种方式都适合先验证安装、兼容性和崩溃情况。

### 如果你想要更开箱即用的平台方案

对这个仓库来说，最贴合现状的平台型方案其实是 `Expo EAS`：

- `EAS Build` 适合云端构建 Android 包
- `EAS internal distribution` 适合快速生成可安装链接
- `EAS Submit` 适合后续把产物提交流程化

但要注意，EAS 解决的是“构建和提交流程”，不是“绕过 Google Play 规则”。

也就是说，就算改用 EAS：

 - 你仍然需要稳定的最终包名
- 你仍然需要正式签名与生产构建
- 你第一次提交到 Play 仍然需要手动上传一次
- 新个人开发者账号的 closed test 门槛也不会消失

## 上 Play 之前先看这几个现实问题

### 1. 现在仓库已经同时支持 APK 和 AAB

Google Play 的新应用正式发布应使用 `Android App Bundle (.aab)`，这一条链路现在已经补上了。

也就是说，当前仓库已经适合：

- 本地调试
- 真机体验
- GitHub / Firebase 分发
- Play 内部测试验证思路
- Play 上传 `AAB` 候选包

但如果要正式上架，仍然需要正式 keystore，而不是 debug keystore 回退包。

### 2. 包名已经切到正式值

当前仓库已经切到正式 Android 包名：

```text
io.github.ly_xxx.tangshijiadao
```

这个值已经适合继续往 Google Play 流程推进。

### 3. 第一次上传 Play 后，包名就固定了

所以不要拿占位包名先随手传一个测试构建到 Console，再想着以后改。

### 4. 新个人开发者账号不适合期待“今天上传，今天公开”

如果你使用的是新创建的个人开发者账号，Play 正式生产发布前有测试门槛。想尽快公开上架，现实中往往不会比 GitHub Releases / Firebase 更快。

## GitHub Actions 与落地页

仓库内已经包含：

- Android 构建工作流：`.github/workflows/build-android.yml`
- GitHub Pages 工作流：`.github/workflows/deploy-pages.yml`
- 落地页源码：`docs/`

推到 `main` 后：

- Actions 会自动构建 release APK artifact
- Pages 会部署静态落地页

如果你只需要一个“能给人看、能给人下 APK”的入口页，这套已经够用。

## 当前仓库离 Play 正式上架还差什么

严格来说，最少还差这几步：

1. 准备正式 keystore
2. 使用正式 release signing 重新出包
3. 在 Play Console 创建应用并补全商店资料
4. 如果是新个人账号，先完成官方要求的 closed test

## 已知限制

- 当前路线依然是 `Expo + WebView + model-viewer`，不是完全自定义渲染管线
- 高级别三渲二、精细遮挡、材质分层和表情系统仍然受限于现有展示层
- `GLB` 路线更适合快速做可安装原型，不代表已经到达最终画质上限

## 文档入口

- [docs/release-build.md](docs/release-build.md)
- [docs/asset-pipeline.md](docs/asset-pipeline.md)
- [tools/blender/README.md](tools/blender/README.md)

## 一句话结论

这个仓库现在最适合的节奏是：

先用 `GitHub Releases` 或 `Firebase App Distribution` 发体验包，边测边稳；等正式签名和 Play Console 资料都定下来，再认真走 Google Play。
