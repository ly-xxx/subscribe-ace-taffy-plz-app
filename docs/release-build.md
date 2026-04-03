# Android Release Build

仓库里现在提供两条 release 构建脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-aab.ps1
```

## 1. Release APK

适合：

- 真机测试
- GitHub Releases 分发体验包
- Firebase App Distribution

默认行为：

- 默认只打 `arm64-v8a`，更贴合真机分发，也能明显减少 APK 体积。
- 如果没有配置正式签名，`release` 会临时回退到 debug keystore。
- 这种 APK 可以用于真机测试、分发体验包，但**不适合上架 Google Play**。
- 构建脚本会同时把 `reactNativeArchitectures` 也锁到同一 ABI，避免 React Native 依赖把其他架构重新打回 APK。
- 脚本默认不额外执行 `clean`，这样能避开 React Native codegen 在本地重复构建时偶发的清理报错。

输出位置：

```text
android/app/build/outputs/apk/release/app-release.apk
```

## 2. Release AAB

适合：

- Google Play Internal testing
- Google Play Closed testing
- Google Play Production

执行命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-aab.ps1
```

默认行为：

- 默认使用 `arm64-v8a,armeabi-v7a`，比单独 `arm64-v8a` 更适合作为 Play 上传产物。
- 如果没有配置正式签名，`release` 仍会回退到 debug keystore。
- 这种 AAB 仅在配置正式 keystore 后，才适合作为正式上架候选包。

输出位置：

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 正式签名

如果你要做“可上架”的 release 包，先准备自己的 keystore，然后在 PowerShell 里设置这四个环境变量：

```powershell
$env:NAIWA_UPLOAD_STORE_FILE = "C:\path\to\upload-keystore.jks"
$env:NAIWA_UPLOAD_STORE_PASSWORD = "your-store-password"
$env:NAIWA_UPLOAD_KEY_ALIAS = "your-key-alias"
$env:NAIWA_UPLOAD_KEY_PASSWORD = "your-key-password"
```

然后再执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1
```

或者：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-aab.ps1
```

如果你要临时覆盖 ABI，也可以这样：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1 -AbiFilters "arm64-v8a"
```

也可以直接把参数传给脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1 `
  -StoreFile "C:\path\to\upload-keystore.jks" `
  -StorePassword "your-store-password" `
  -KeyAlias "your-key-alias" `
  -KeyPassword "your-key-password"
```

`AAB` 脚本同样支持这四个参数，并支持用 `-AbiFilters "arm64-v8a,armeabi-v7a"` 或其他值覆盖默认 ABI 策略。

## 当前仓库的实际状态

- `android/app/build.gradle` 已支持读取 `NAIWA_UPLOAD_*` 变量作为 release 签名配置。
- `android/app/build.gradle` 已支持读取 `NAIWA_ABI_FILTERS`，当前默认值是 `arm64-v8a`。
- Android 正式包名已切到 `io.github.ly_xxx.tangshijiadao`。
- 如果没有这些变量，Gradle 会明确提示正在回退到 debug keystore。
- GitHub Actions 会同时产出 `release APK` 和 `release AAB` artifact。
- 这让你可以先无门槛打 `release APK` 做体验，再在准备好正式证书后切换成可发布版本。
