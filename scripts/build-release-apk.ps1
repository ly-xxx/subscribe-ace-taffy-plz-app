param(
    [string]$StoreFile = $env:NAIWA_UPLOAD_STORE_FILE,
    [string]$StorePassword = $env:NAIWA_UPLOAD_STORE_PASSWORD,
    [string]$KeyAlias = $env:NAIWA_UPLOAD_KEY_ALIAS,
    [string]$KeyPassword = $env:NAIWA_UPLOAD_KEY_PASSWORD,
    [string]$AbiFilters = "arm64-v8a"
)

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
    throw "Java 17 not found. Install Microsoft.OpenJDK.17 or update scripts/build-release-apk.ps1."
}

if (-not (Test-Path $sdkRoot)) {
    throw "Android SDK not found at: $sdkRoot"
}

if ($StoreFile) {
    $resolvedStoreFile = (Resolve-Path $StoreFile).Path
    $env:NAIWA_UPLOAD_STORE_FILE = $resolvedStoreFile
}

if ($StorePassword) {
    $env:NAIWA_UPLOAD_STORE_PASSWORD = $StorePassword
}

if ($KeyAlias) {
    $env:NAIWA_UPLOAD_KEY_ALIAS = $KeyAlias
}

if ($KeyPassword) {
    $env:NAIWA_UPLOAD_KEY_PASSWORD = $KeyPassword
}

if (-not $PSBoundParameters.ContainsKey('AbiFilters') -and $env:NAIWA_ABI_FILTERS) {
    $AbiFilters = $env:NAIWA_ABI_FILTERS
}

if ($AbiFilters) {
    $env:NAIWA_ABI_FILTERS = $AbiFilters
}

$hasCustomSigning = @(
    $env:NAIWA_UPLOAD_STORE_FILE,
    $env:NAIWA_UPLOAD_STORE_PASSWORD,
    $env:NAIWA_UPLOAD_KEY_ALIAS,
    $env:NAIWA_UPLOAD_KEY_PASSWORD
) -notcontains $null -and
@(
    $env:NAIWA_UPLOAD_STORE_FILE,
    $env:NAIWA_UPLOAD_STORE_PASSWORD,
    $env:NAIWA_UPLOAD_KEY_ALIAS,
    $env:NAIWA_UPLOAD_KEY_PASSWORD
) -notcontains ""

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:NODE_ENV = "production"

Write-Host "JAVA_HOME:" $env:JAVA_HOME
Write-Host "ANDROID_SDK_ROOT:" $env:ANDROID_SDK_ROOT
Write-Host "ABI filters:" $env:NAIWA_ABI_FILTERS
Write-Host "NODE_ENV:" $env:NODE_ENV
if ($hasCustomSigning) {
    Write-Host "Release signing: custom keystore"
    Write-Host "Store file:" $env:NAIWA_UPLOAD_STORE_FILE
} else {
    Write-Warning "Release signing is falling back to the debug keystore. This build is suitable for testing, not store upload."
}

Push-Location $repoRoot
try {
    if (-not (Test-Path $androidDir)) {
        npx expo prebuild --platform android
    }

    Push-Location $androidDir
    try {
        & .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$($env:NAIWA_ABI_FILTERS)"
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}

$apkPath = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    Write-Host "APK:" $apkPath
} else {
    throw "Build completed but release APK was not found at: $apkPath"
}
