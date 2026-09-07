import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  UseGuards,
  StreamableFile,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import * as path from "path";
import * as fs from "fs";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";

@Controller("fleet/installer")
export class InstallerController {
  /**
   * GET /api/v1/fleet/installer/windows
   * Returns a PowerShell script that installs NOS Agent on any Windows PC.
   * The script prompts for a registration key and server URL, then
   * downloads + runs the self-contained NOS-Agent.exe.
   */
  @Get("windows")
  async getWindowsInstaller(
    @Query("registrationKey") registrationKey: string,
    @Query("serverUrl") serverUrl: string,
    @Res() res: Response,
  ) {
    // Sanitize inputs to prevent script injection
    const safeKey = (registrationKey || "").replace(/[^A-Za-z0-9\-]/g, "");
    const safeServer = (serverUrl || "http://13.127.187.47/api/v1")
      .replace(/[`$'"\\]/g, "")
      .replace(/\s/g, "");

    const agentDownloadUrl = `${safeServer.replace(/\/api\/v1$/, "")}/downloads/NOS-Agent.exe`;

    const script = `
# =============================================================================
# NOS Agent — One-Click Windows Installer
# Network Operations & Security Platform
# =============================================================================
# Generated: ${new Date().toISOString()}
# Server:    ${safeServer}
# =============================================================================

#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

# ─── Configuration ────────────────────────────────────────────────────────────
$ServerUrl       = "${safeServer}"
$AgentExeUrl     = "${agentDownloadUrl}"
$FallbackExeUrl  = "${safeServer}/fleet/installer/agent"
$InstallDir      = "$env:ProgramFiles\\NOSAgent"
$ServiceName     = "NOS-Agent"
$ServiceDisplay  = "Neural Operating System (NOS) Agent"
$ExePath         = Join-Path $InstallDir "NOS-Agent.exe"
$LocalDataDir    = "$env:LOCALAPPDATA\\NOS"
$ProgramDataDir  = "$env:ProgramData\\NOS"

# ─── Banner ───────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║         NOS AGENT — WINDOWS INSTALLER               ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Get Registration Key ─────────────────────────────────────────────────────
$RegistrationKey = "${safeKey}"
if ([string]::IsNullOrWhiteSpace($RegistrationKey)) {
    Write-Host "  Please enter your Registration Key (from the NOS Dashboard):" -ForegroundColor Yellow
    $RegistrationKey = Read-Host "  Registration Key"
}

if ([string]::IsNullOrWhiteSpace($RegistrationKey)) {
    Write-Host "  [!] No registration key provided. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  [→] Installing NOS Agent..." -ForegroundColor Cyan
Write-Host ""

# ─── Create Directories ───────────────────────────────────────────────────────
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Host "  [✓] Created install directory: $InstallDir" -ForegroundColor Green
}
if (-not (Test-Path $LocalDataDir)) {
    New-Item -ItemType Directory -Path $LocalDataDir -Force | Out-Null
}
if (-not (Test-Path $ProgramDataDir)) {
    New-Item -ItemType Directory -Path $ProgramDataDir -Force | Out-Null
}

# ─── Save Configuration ───────────────────────────────────────────────────────
$configObj = @{
    AgentConfiguration = @{
        ServerUrl = $ServerUrl
        DeviceId  = ""
        TenantId  = ""
        ApiKey    = $RegistrationKey
    }
} | ConvertTo-Json -Depth 5

Set-Content -Path (Join-Path $LocalDataDir "appsettings.json") -Value $configObj
try { Set-Content -Path (Join-Path $ProgramDataDir "appsettings.json") -Value $configObj } catch {}
try { Set-Content -Path (Join-Path $InstallDir "appsettings.json") -Value $configObj } catch {}
Write-Host "  [✓] Configuration saved" -ForegroundColor Green

# ─── Download Agent EXE ───────────────────────────────────────────────────────
Write-Host "  [→] Downloading NOS Agent from server..." -ForegroundColor Cyan

$downloadSuccess = $false
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    try {
        Invoke-WebRequest -Uri $AgentExeUrl -OutFile $ExePath -TimeoutSec 180 -UseBasicParsing
        $downloadSuccess = $true
    } catch {
        Write-Host "  [!] Primary URL ($AgentExeUrl) failed, trying API endpoint..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $FallbackExeUrl -OutFile $ExePath -TimeoutSec 180 -UseBasicParsing
        $downloadSuccess = $true
    }
    Write-Host "  [✓] Agent downloaded to: $ExePath" -ForegroundColor Green
} catch {
    Write-Host "  [!] Auto-download failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  [→] Checking for local agent copy..." -ForegroundColor Cyan
    
    # Try to find agent in common local paths (for dev installs)
    $localPaths = @(
        "$env:USERPROFILE\\Desktop\\NOS-Agent.exe",
        "$env:USERPROFILE\\Downloads\\NOS-Agent.exe",
        "$PSScriptRoot\\NOS-Agent.exe"
    )
    foreach ($lp in $localPaths) {
        if (Test-Path $lp) {
            Copy-Item $lp $ExePath -Force
            $downloadSuccess = $true
            Write-Host "  [✓] Found local copy at: $lp" -ForegroundColor Green
            break
        }
    }
}

if (-not $downloadSuccess) {
    Write-Host ""
    Write-Host "  [!] Could not obtain NOS-Agent.exe." -ForegroundColor Red
    Write-Host "      Please download NOS-Agent.exe from your admin dashboard and" -ForegroundColor Red
    Write-Host "      place it in the same folder as this script, then re-run." -ForegroundColor Red
    exit 1
}

# ─── Stop & Remove Existing Service ──────────────────────────────────────────
$existingSvc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingSvc) {
    Write-Host "  [→] Stopping existing service..." -ForegroundColor Cyan
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    & sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 1
    Write-Host "  [✓] Existing service removed" -ForegroundColor Green
}

# ─── Register as Windows Service ──────────────────────────────────────────────
Write-Host "  [→] Registering Windows Service..." -ForegroundColor Cyan
& sc.exe create $ServiceName binPath= \`"$ExePath\`" start= auto DisplayName= $ServiceDisplay | Out-Null
& sc.exe description $ServiceName "Autonomous endpoint telemetry and health monitoring daemon for NOS platform." | Out-Null
& sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null

# ─── Perform One-Time Device Registration ─────────────────────────────────────
Write-Host ""
Write-Host "  [→] Registering device with control plane..." -ForegroundColor Cyan

& "$ExePath" --register --key "$RegistrationKey" --url "$ServerUrl"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [!] Initial registration exited with code $LASTEXITCODE. The service will attempt auto-registration." -ForegroundColor Yellow
} else {
    Write-Host "  [✓] Device registration successful!" -ForegroundColor Green
}

# ─── Start Service ─────────────────────────────────────────────────────────────
Write-Host "  [→] Starting NOS Agent service..." -ForegroundColor Cyan
Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

$svcStatus = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svcStatus -and $svcStatus.Status -eq 'Running') {
    Write-Host "  [✓] NOS Agent service is RUNNING" -ForegroundColor Green
} else {
    Write-Host "  [!] Service not running — starting manually" -ForegroundColor Yellow
    Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
}

# ─── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║           INSTALLATION COMPLETE ✓                   ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  The NOS Agent is now running on this PC." -ForegroundColor Cyan
Write-Host "  It will appear in your fleet dashboard within 60 seconds." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Server:   $ServerUrl" -ForegroundColor Gray
Write-Host "  Install:  $InstallDir" -ForegroundColor Gray
Write-Host "  Service:  $ServiceName" -ForegroundColor Gray
Write-Host ""
`.trim();

    const setHeader = (name: string, value: string | number) => {
      if (typeof (res as any).header === "function") {
        (res as any).header(name, value);
      } else if (typeof (res as any).setHeader === "function") {
        (res as any).setHeader(name, value);
      }
    };

    setHeader("Content-Type", "text/plain; charset=utf-8");
    setHeader(
      "Content-Disposition",
      'attachment; filename="install-nos-agent.ps1"',
    );
    return (res as any).status(200).send(script);
  }

  /**
   * GET /api/v1/fleet/installer/agent
   * Streams the pre-built NOS-Agent.exe for download.
   * Publicly accessible so target PCs can download the binary directly or via PowerShell.
   */
  @Get("agent")
  async downloadAgentExe(@Res({ passthrough: true }) res: Response) {
    const exePath = path.join(process.cwd(), "assets", "NOS-Agent.exe");

    if (!fs.existsSync(exePath)) {
      throw new NotFoundException(
        "NOS Agent executable not found. Please build the agent via apps/NOS.Agent/publish.ps1 to generate apps/backend/assets/NOS-Agent.exe",
      );
    }

    const stat = fs.statSync(exePath);
    if (typeof (res as any).header === "function") {
      (res as any).header("Content-Type", "application/octet-stream");
      (res as any).header(
        "Content-Disposition",
        'attachment; filename="NOS-Agent.exe"',
      );
      (res as any).header("Content-Length", stat.size);
    } else if (typeof (res as any).setHeader === "function") {
      (res as any).setHeader("Content-Type", "application/octet-stream");
      (res as any).setHeader(
        "Content-Disposition",
        'attachment; filename="NOS-Agent.exe"',
      );
      (res as any).setHeader("Content-Length", stat.size);
    }

    const stream = fs.createReadStream(exePath);
    return new StreamableFile(stream);
  }
}
