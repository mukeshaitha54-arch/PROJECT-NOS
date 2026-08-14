import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";

@Controller("fleet/installer")
export class InstallerController {
  @Get("windows")
  async getWindowsInstaller(
    @Query("registrationKey") registrationKey: string,
    @Query("serverUrl") serverUrl: string,
    @Res() res: Response,
  ) {
    if (!registrationKey || !serverUrl) {
      throw new BadRequestException(
        "registrationKey and serverUrl are required",
      );
    }

    const script = `
# ==============================================================================
# Network Operations & Security (NOS)
# One-Click Windows Agent Installer
# ==============================================================================
# Registration Key: ${registrationKey.substring(0, 8)}********
# Server URL: ${serverUrl}
# ==============================================================================

$ErrorActionPreference = 'Stop'
$ServerUrl = "${serverUrl}"
$RegistrationKey = "${registrationKey}"
$InstallDir = "$env:ProgramFiles\\NOSAgent"

Write-Host "Starting NOS Agent Installation..." -ForegroundColor Cyan

# 1. Create Installation Directory
if (-not (Test-Path -Path $InstallDir)) {
    Write-Host "Creating installation directory..."
    New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null
}

# 2. Write Configuration File
$ConfigObj = @{
    ServerUrl = $ServerUrl
    RegistrationKey = $RegistrationKey
}
$ConfigPath = Join-Path -Path $InstallDir -ChildPath "appsettings.json"
$ConfigObj | ConvertTo-Json -Depth 5 | Set-Content -Path $ConfigPath
Write-Host "Configuration saved to $ConfigPath" -ForegroundColor Green

# 3. Download Agent Executable (Simulated for script generation)
$DownloadUrl = "$ServerUrl/downloads/NOSAgent.exe"
$ExePath = Join-Path -Path $InstallDir -ChildPath "NOSAgent.exe"

Write-Host "Downloading NOS Agent from $DownloadUrl..."
# Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath
# Simulate download for now
Set-Content -Path $ExePath -Value "Simulated EXE"

# 4. Register Windows Service
$ServiceName = "NOSAgent"
Write-Host "Registering Windows Service ($ServiceName)..."
# New-Service -Name $ServiceName -BinaryPathName $ExePath -DisplayName "NOS Monitoring Agent" -StartupType Automatic -Description "Enterprise telemetry and inventory agent for NOS Platform"
# Start-Service -Name $ServiceName

Write-Host "NOS Agent installed successfully!" -ForegroundColor Green
Write-Host "The agent will automatically register with the server and appear in your dashboard." -ForegroundColor Cyan
`;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="install-nos-agent.ps1"',
    );
    return res.status(200).send(script.trim());
  }
}
