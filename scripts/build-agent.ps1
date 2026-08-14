# ========================================================
#  NOS Agent - Single-File Windows Executable PowerShell Build
# ========================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " NOS Agent - Single-File Windows Executable Build" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$agentDir = Join-Path $PSScriptRoot "..\apps\NOS.Agent"
$outputDir = Join-Path $PSScriptRoot "..\dist\agent"

if (!(Test-Path $agentDir)) {
    Write-Error "Agent directory not found: $agentDir"
    exit 1
}

Write-Host "[*] Publishing self-contained win-x64 executable..." -ForegroundColor Yellow
Push-Location $agentDir
try {
    dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=false -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -p:DebugSymbols=false -o $outputDir
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] Single-file Agent EXE created at:" -ForegroundColor Green
        Write-Host " $outputDir\NOS.Agent.exe" -ForegroundColor Green
        Write-Host "========================================================" -ForegroundColor Green
        
        $exePath = Join-Path $outputDir "NOS.Agent.exe"
        if (Test-Path $exePath) {
            $sizeMb = [math]::Round((Get-Item $exePath).Length / 1MB, 2)
            Write-Host "[INFO] Binary Size: $sizeMb MB (Self-Contained .NET Runtime + Agent)" -ForegroundColor Cyan
        }
    } else {
        Write-Error "Build failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
