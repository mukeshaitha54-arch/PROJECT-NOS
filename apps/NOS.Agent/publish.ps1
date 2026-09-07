#Requires -Version 5.1
# ==============================================================================
# NOS Agent -- Build & Publish Script
# ==============================================================================
# Builds a self-contained single-file Windows executable and copies it to
# apps/backend/assets/NOS-Agent.exe so the backend can serve it as a download.
#
# Usage (works from repo root OR from apps\NOS.Agent\):
#   .\apps\NOS.Agent\publish.ps1
#   -- or --
#   cd apps\NOS.Agent
#   .\publish.ps1
# ==============================================================================

$ErrorActionPreference = 'Stop'

# Resolve absolute paths using $PSScriptRoot (always the script's own folder)
$ScriptDir = $PSScriptRoot
$ProjectFile = Join-Path $ScriptDir "NOS.Agent.csproj"
$PublishDir = Join-Path $ScriptDir "publish-output"
$AssetsDir = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\..\apps\backend\assets"))
$FinalExe = Join-Path $AssetsDir "NOS-Agent.exe"

Write-Host ""
Write-Host "  NOS Agent -- Self-Contained Build Script" -ForegroundColor Cyan
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Project : $ProjectFile" -ForegroundColor Gray
Write-Host "  Output  : $FinalExe"   -ForegroundColor Gray
Write-Host ""

# Check project file exists
if (-not (Test-Path $ProjectFile)) {
    Write-Host "  [ERROR] Project file not found: $ProjectFile" -ForegroundColor Red
    Write-Host "          Run from the repo root or from apps\NOS.Agent\" -ForegroundColor Red
    exit 1
}

# Check dotnet is on PATH
$null = & dotnet --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] 'dotnet' not found on PATH. Install .NET 8 SDK first." -ForegroundColor Red
    exit 1
}
$DotnetVer = (& dotnet --version 2>$null)
Write-Host "  [OK] .NET SDK $DotnetVer detected" -ForegroundColor Green

# Clean previous publish output
if (Test-Path $PublishDir) {
    Remove-Item $PublishDir -Recurse -Force
    Write-Host "  [OK] Cleaned previous publish output" -ForegroundColor Green
}

# Ensure backend assets directory exists
if (-not (Test-Path $AssetsDir)) {
    New-Item -ItemType Directory -Path $AssetsDir -Force | Out-Null
    Write-Host "  [OK] Created assets directory: $AssetsDir" -ForegroundColor Green
}

# Run dotnet publish using array splatting (avoids backtick issues)
Write-Host ""
Write-Host "  [-->] Publishing (Release | win-x64 | self-contained)..." -ForegroundColor Cyan
Write-Host ""

$DotnetArgs = @(
    "publish", $ProjectFile,
    "--configuration", "Release",
    "--runtime", "win-x64",
    "--self-contained", "true",
    "-p:PublishSingleFile=true",
    "-p:DebugType=none",
    "-p:DebugSymbols=false",
    "-p:EnableCompressionInSingleFile=true",
    "--output", $PublishDir,
    "--nologo"
)

& dotnet @DotnetArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  [ERROR] dotnet publish failed (exit $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}

# Find the produced exe
$ProducedExe = Get-ChildItem $PublishDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $ProducedExe) {
    Write-Host "  [ERROR] No .exe found in: $PublishDir" -ForegroundColor Red
    Write-Host "  Files in publish dir:" -ForegroundColor Red
    Get-ChildItem $PublishDir | ForEach-Object { Write-Host "    - $($_.Name)" -ForegroundColor Red }
    exit 1
}

# Copy to backend assets
Copy-Item $ProducedExe.FullName $FinalExe -Force

$SizeMB = [math]::Round((Get-Item $FinalExe).Length / 1MB, 1)

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  File   : $FinalExe" -ForegroundColor White
Write-Host "  Size   : $SizeMB MB"                        -ForegroundColor White
Write-Host ""
Write-Host "  Served at:" -ForegroundColor Cyan
Write-Host "    http://localhost:4000/downloads/NOS-Agent.exe" -ForegroundColor Yellow
Write-Host "    http://nos.is-local.org/downloads/NOS-Agent.exe"  -ForegroundColor Yellow
Write-Host ""
