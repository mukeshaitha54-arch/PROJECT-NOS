# Elevate script if not already elevated
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"{0}`"" -f $PSCommandPath) -Verb RunAs
    exit
}

Write-Host "Stopping NOS-Agent service..." -ForegroundColor Cyan
Stop-Service -Name 'NOS-Agent' -Force -ErrorAction SilentlyContinue
Stop-Process -Name 'NOS-Agent' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$source = "$PSScriptRoot\..\apps\backend\assets\NOS-Agent.exe"
if (!(Test-Path $source)) {
    $source = "C:\Users\mukes\OneDrive\Desktop\NOS\apps\backend\assets\NOS-Agent.exe"
}
$target = "C:\Program Files\NOSAgent\NOS-Agent.exe"

Write-Host "Copying $source to $target..." -ForegroundColor Cyan
Copy-Item -Path $source -Destination $target -Force

Write-Host "Cleaning outbox queue database..." -ForegroundColor Cyan
Remove-Item -Path 'C:\ProgramData\NOS\outbox.db*' -Force -ErrorAction SilentlyContinue

Write-Host "Starting NOS-Agent service..." -ForegroundColor Cyan
Start-Service -Name 'NOS-Agent'

Write-Host "Agent updated and service started successfully!" -ForegroundColor Green
Start-Sleep -Seconds 3
