import { Controller, Get, Query, Res, NotFoundException } from "@nestjs/common";
import { Response } from "express";
import * as path from "path";
import * as fs from "fs";

@Controller("fleet/installer")
export class InstallerController {
  /**
   * GET /api/v1/fleet/installer/windows
   * Returns a PowerShell 5.1-compatible script that installs NOS Agent on Windows.
   * Uses string-array approach to avoid ALL backtick/template-literal escaping issues.
   */
  @Get("windows")
  async getWindowsInstaller(
    @Query("registrationKey") registrationKey: string,
    @Query("serverUrl") serverUrl: string,
    @Res() res: Response,
  ) {
    const safeKey = (registrationKey || "").replace(/[^A-Za-z0-9\-]/g, "");
    const safeServer = (serverUrl || "http://13.127.187.47/api/v1")
      .replace(/[`$'"\\]/g, "")
      .replace(/\s/g, "");
    const agentApiUrl = `${safeServer}/fleet/installer/agent`;

    // Each element is one line of the generated .ps1 file.
    // Plain strings = no escaping needed. Template literals only where TS values injected.
    const lines: string[] = [
      "# ===========================================================================",
      "# NOS Agent - Windows Installer",
      `# Generated: ${new Date().toISOString()}`,
      `# Server:    ${safeServer}`,
      "# ===========================================================================",
      "",
      "#Requires -RunAsAdministrator",
      "",
      "# ---------- Configuration ---------------------------------------------------",
      `$ServerUrl      = '${safeServer}'`,
      `$AgentApiUrl    = '${agentApiUrl}'`,
      `$RegKey         = '${safeKey}'`,
      "$ServiceName    = 'NOS-Agent'",
      "$ServiceDisplay = 'Neural Operating System (NOS) Agent'",
      "$ServiceDesc    = 'Endpoint telemetry and health monitoring daemon for NOS.'",
      "$InstallDir     = Join-Path $env:ProgramFiles 'NOSAgent'",
      "$ExePath        = Join-Path $InstallDir 'NOS-Agent.exe'",
      "$ConfigDir      = Join-Path $env:LOCALAPPDATA 'NOS'",
      "",
      "# ---------- Banner ----------------------------------------------------------",
      "Clear-Host",
      "Write-Host ''",
      "Write-Host '  +--------------------------------------------------+' -ForegroundColor Cyan",
      "Write-Host '  |       NOS AGENT - WINDOWS INSTALLER              |' -ForegroundColor Cyan",
      "Write-Host '  +--------------------------------------------------+' -ForegroundColor Cyan",
      "Write-Host ''",
      "",
      "# ---------- Registration Key ------------------------------------------------",
      "if ([string]::IsNullOrWhiteSpace($RegKey)) {",
      "    Write-Host '  Enter your Registration Key from the NOS Dashboard:' -ForegroundColor Yellow",
      "    $RegKey = Read-Host '  Registration Key'",
      "}",
      "",
      "if ([string]::IsNullOrWhiteSpace($RegKey)) {",
      "    Write-Host '  [!] No registration key provided. Aborting.' -ForegroundColor Red",
      "    exit 1",
      "}",
      "",
      "Write-Host ''",
      "Write-Host '  [*] Installing NOS Agent...' -ForegroundColor Cyan",
      "Write-Host ''",
      "",
      "# ---------- Create Directories ----------------------------------------------",
      "if (-not (Test-Path $InstallDir)) {",
      "    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null",
      '    Write-Host "  [+] Created: $InstallDir" -ForegroundColor Green',
      "}",
      "if (-not (Test-Path $ConfigDir)) {",
      "    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null",
      "}",
      "",
      "# ---------- Save Configuration ----------------------------------------------",
      "$cfg = [ordered]@{",
      "    ServerUrl = $ServerUrl",
      "    ApiKey    = $RegKey",
      "    DeviceId  = ''",
      "}",
      "$cfgJson = $cfg | ConvertTo-Json -Depth 3",
      "Set-Content -Path (Join-Path $ConfigDir 'appsettings.json') -Value $cfgJson -Encoding UTF8",
      "try { Set-Content -Path (Join-Path $InstallDir 'appsettings.json') -Value $cfgJson -Encoding UTF8 } catch { }",
      "Write-Host '  [+] Configuration saved.' -ForegroundColor Green",
      "",
      "# ---------- Download Agent EXE ----------------------------------------------",
      "Write-Host '  [*] Downloading NOS Agent...' -ForegroundColor Cyan",
      "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12",
      "",
      "$downloaded = $false",
      "try {",
      "    Invoke-WebRequest -Uri $AgentApiUrl -OutFile $ExePath -TimeoutSec 180 -UseBasicParsing",
      "    $downloaded = $true",
      '    Write-Host "  [+] Downloaded to: $ExePath" -ForegroundColor Green',
      "}",
      "catch {",
      '    Write-Host "  [!] Download failed: $($_.Exception.Message)" -ForegroundColor Yellow',
      "}",
      "",
      "if (-not $downloaded) {",
      "    $searchPaths = @(",
      "        (Join-Path $env:USERPROFILE 'Desktop\\NOS-Agent.exe'),",
      "        (Join-Path $env:USERPROFILE 'Downloads\\NOS-Agent.exe'),",
      "        (Join-Path $PSScriptRoot 'NOS-Agent.exe')",
      "    )",
      "    foreach ($p in $searchPaths) {",
      "        if (Test-Path $p) {",
      "            Copy-Item -Path $p -Destination $ExePath -Force",
      "            $downloaded = $true",
      '            Write-Host "  [+] Found local copy: $p" -ForegroundColor Green',
      "            break",
      "        }",
      "    }",
      "}",
      "",
      "if (-not $downloaded) {",
      "    Write-Host '  [!] Cannot obtain NOS-Agent.exe.' -ForegroundColor Red",
      "    Write-Host '      Download from dashboard and place it next to this script, then re-run.' -ForegroundColor Red",
      "    exit 1",
      "}",
      "",
      "# ---------- Remove Existing Service -----------------------------------------",
      "$existingSvc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue",
      "if ($null -ne $existingSvc) {",
      "    Write-Host '  [*] Removing existing service...' -ForegroundColor Cyan",
      "    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue",
      "    Start-Sleep -Seconds 2",
      "    sc.exe delete $ServiceName | Out-Null",
      "    Start-Sleep -Seconds 1",
      "    Write-Host '  [+] Existing service removed.' -ForegroundColor Green",
      "}",
      "",
      "# ---------- Install Windows Service -----------------------------------------",
      "Write-Host '  [*] Installing Windows Service...' -ForegroundColor Cyan",
      "$binPath = ([char]34 + $ExePath + [char]34)",
      "sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= $ServiceDisplay | Out-Null",
      "sc.exe description $ServiceName $ServiceDesc | Out-Null",
      "sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000 | Out-Null",
      "Write-Host '  [+] Service registered.' -ForegroundColor Green",
      "",
      "# ---------- Start Service ---------------------------------------------------",
      "Write-Host '  [*] Starting NOS Agent service...' -ForegroundColor Cyan",
      "Start-Service -Name $ServiceName -ErrorAction SilentlyContinue",
      "Start-Sleep -Seconds 3",
      "",
      "$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue",
      "if ($null -ne $svc -and $svc.Status -eq 'Running') {",
      "    Write-Host '  [+] NOS Agent service is RUNNING.' -ForegroundColor Green",
      "}",
      "else {",
      "    Write-Host '  [!] Service did not start - check Event Viewer.' -ForegroundColor Yellow",
      "}",
      "",
      "# ---------- Done ------------------------------------------------------------",
      "Write-Host ''",
      "Write-Host '  +--------------------------------------------------+' -ForegroundColor Green",
      "Write-Host '  |         INSTALLATION COMPLETE                    |' -ForegroundColor Green",
      "Write-Host '  +--------------------------------------------------+' -ForegroundColor Green",
      "Write-Host ''",
      'Write-Host "  Server:  $ServerUrl" -ForegroundColor Gray',
      'Write-Host "  Install: $InstallDir" -ForegroundColor Gray',
      'Write-Host "  Service: $ServiceName" -ForegroundColor Gray',
      "Write-Host ''",
    ];

    const script = lines.join("\r\n");

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
   */
  @Get("agent")
  async downloadAgentExe(@Res({ passthrough: true }) res: Response) {
    const tryPaths = [
      path.join(__dirname, "..", "..", "..", "..", "assets", "NOS-Agent.exe"),
      path.join(__dirname, "..", "..", "..", "assets", "NOS-Agent.exe"),
      path.join(process.cwd(), "apps", "backend", "assets", "NOS-Agent.exe"),
      path.join(process.cwd(), "assets", "NOS-Agent.exe"),
    ];

    const exePath = tryPaths.find((p) => fs.existsSync(p));

    if (!exePath) {
      throw new NotFoundException(
        "NOS Agent executable not found. Build via apps/NOS.Agent/publish.ps1 to generate apps/backend/assets/NOS-Agent.exe",
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
    const { StreamableFile } = await import("@nestjs/common");
    return new StreamableFile(stream);
  }
}
