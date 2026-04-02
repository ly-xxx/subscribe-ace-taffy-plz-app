param(
    [string]$BlenderExe = "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe",
    [string]$PmxPath = "",
    [string]$VmdPath = "",
    [string]$OutputPath = ".\assets\exports\taffy-laugh.glb"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$blenderScripts = Resolve-Path $PSScriptRoot
$convertScript = Resolve-Path (Join-Path $PSScriptRoot "convert_mmd_to_glb.py")

function Resolve-InputPath([string]$PathValue) {
    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return (Resolve-Path -LiteralPath $PathValue).Path
    }

    return (Resolve-Path -LiteralPath (Join-Path $repoRoot $PathValue)).Path
}

function Resolve-OutputPath([string]$PathValue) {
    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $PathValue))
}

function Find-SingleFile([string]$RootPath, [string]$Filter) {
    $matches = @(Get-ChildItem -LiteralPath $RootPath -Recurse -File -Filter $Filter)
    if ($matches.Count -eq 0) {
        throw "No file matching '$Filter' found under: $RootPath"
    }
    if ($matches.Count -gt 1) {
        throw "Multiple files matching '$Filter' found under: $RootPath. Pass an explicit path instead."
    }

    return $matches[0].FullName
}

if ([string]::IsNullOrWhiteSpace($PmxPath)) {
    $resolvedPmx = Find-SingleFile (Join-Path $repoRoot "assets\\mmd\\taffy_base") "*.pmx"
} else {
    $resolvedPmx = Resolve-InputPath $PmxPath
}

if ([string]::IsNullOrWhiteSpace($VmdPath)) {
    $resolvedVmd = Find-SingleFile (Join-Path $repoRoot "assets\\mmd\\taffy_motion") "*.vmd"
} else {
    $resolvedVmd = Resolve-InputPath $VmdPath
}

$resolvedOutput = Resolve-OutputPath $OutputPath

if (-not (Test-Path -LiteralPath $BlenderExe)) {
    throw "Blender executable not found: $BlenderExe"
}

$outputDir = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$env:BLENDER_USER_SCRIPTS = $blenderScripts.Path
$env:NAIWA_PMX = $resolvedPmx
$env:NAIWA_VMD = $resolvedVmd
$env:NAIWA_GLB_OUT = $resolvedOutput

Write-Host "Blender:" $BlenderExe
Write-Host "PMX:" $env:NAIWA_PMX
Write-Host "VMD:" $env:NAIWA_VMD
Write-Host "Output:" $env:NAIWA_GLB_OUT

& $BlenderExe --background --factory-startup --python-exit-code 1 --python $convertScript
