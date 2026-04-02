# Android Release APK

仓库里已经提供了一个可直接执行的 release 构建脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1
```

默认行为：

- 如果没有配置正式签名，`release` 会临时回退到 debug keystore。
- 这种 APK 可以用于真机测试、分发体验包，但**不适合上架 Google Play**。

输出位置：

```text
android/app/build/outputs/apk/release/app-release.apk
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

也可以直接把参数传给脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1 `
  -StoreFile "C:\path\to\upload-keystore.jks" `
  -StorePassword "your-store-password" `
  -KeyAlias "your-key-alias" `
  -KeyPassword "your-key-password"
```

## 当前仓库的实际状态

- `android/app/build.gradle` 已支持读取 `NAIWA_UPLOAD_*` 变量作为 release 签名配置。
- 如果没有这些变量，Gradle 会明确提示正在回退到 debug keystore。
- 这让你可以先无门槛打 `release APK` 做体验，再在准备好正式证书后切换成可发布版本。
