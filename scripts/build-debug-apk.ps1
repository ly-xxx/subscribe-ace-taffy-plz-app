Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidDir = Join-Path $repoRoot "android"
$sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"

$javaCandidates = @(
    "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot",
    "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot",
    "C:\Program Files\Microsoft\jdk-17.0.16.8-hotspot"
)

$javaHome = $javaCandidates | Where-Object { Test-Path (Join-Path $_ "bin\java.exe") } | Select-Object -First 1

if (-not $javaHome) {
    throw "Java 17 not found. Install Microsoft.OpenJDK.17 or update scripts/build-debug-apk.ps1."
}

if (-not (Test-Path $sdkRoot)) {
    throw "Android SDK not found at: $sdkRoot"
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot

Write-Host "JAVA_HOME:" $env:JAVA_HOME
Write-Host "ANDROID_SDK_ROOT:" $env:ANDROID_SDK_ROOT

Push-Location $repoRoot
try {
    if (-not (Test-Path $androidDir)) {
        npx expo prebuild --platform android
    }

    Push-Location $androidDir
    try {
        & .\gradlew.bat assembleDebug
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}

$apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "APK:" $apkPath
} else {
    throw "Build completed but APK was not found at: $apkPath"
}
