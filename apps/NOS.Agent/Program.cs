using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NOS.Agent.Configuration;
using NOS.Agent.Data;
using NOS.Agent.Services;

namespace NOS.Agent
{
    public class Program
    {
        private const string ServiceName = "NOS Agent";
        private const string ServiceDisplayName = "Neural Operating System (NOS) Agent";

        public static async Task<int> Main(string[] args)
        {
            // 1. Handle Command Line Flags
            if (args.Length > 0)
            {
                var flag = args[0].ToLowerInvariant().TrimStart('-', '/');

                if (flag is "help" or "h" or "?")
                {
                    PrintHelp();
                    return 0;
                }

                if (flag is "register" or "r")
                {
                    string? regKey = null;
                    string? regUrl = null;
                    for (int i = 1; i < args.Length; i++)
                    {
                        var arg = args[i].ToLowerInvariant().TrimStart('-', '/');
                        if ((arg == "key" || arg == "k") && i + 1 < args.Length)
                        {
                            regKey = args[++i];
                        }
                        else if ((arg == "url" || arg == "server") && i + 1 < args.Length)
                        {
                            regUrl = args[++i];
                        }
                    }
                    return await ExecuteRegistrationAsync(regKey, regUrl);
                }

                if (flag is "install" or "i")
                {
                    return InstallService();
                }

                if (flag is "uninstall" or "u" or "remove")
                {
                    return UninstallService();
                }

                if (flag is "start")
                {
                    return StartService();
                }

                if (flag is "stop")
                {
                    return StopService();
                }
            }

            // 2. Interactive Console Banner
            if (Environment.UserInteractive)
            {
                PrintBanner();
            }

            // 2a. First-Run Setup Wizard (only in interactive console mode)
            if (Environment.UserInteractive)
            {
                await RunFirstTimeSetupAsync();
            }

            // 3. Ensure Local AppData Directory Exists
            var appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOS");
            if (!Directory.Exists(appDataDir))
            {
                Directory.CreateDirectory(appDataDir);
            }

            // 4. Try Registering Windows Event Log Source
            try
            {
                if (OperatingSystem.IsWindows() && !EventLog.SourceExists("NOS-Agent"))
                {
                    EventLog.CreateEventSource("NOS-Agent", "Application");
                }
            }
            catch
            {
                // Non-elevated execution continues safely
            }

            // 5. Build and Run Host
            try
            {
                var host = CreateHostBuilder(args).Build();

                using (var scope = host.Services.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                    await dbContext.InitializeAsync();

                    var yesterday = DateTime.UtcNow.AddDays(-1);
                    var crashCount = await dbContext.CrashLogs.CountAsync(c => c.Timestamp >= yesterday);
                    if (crashCount > 3)
                    {
                        var safeMode = scope.ServiceProvider.GetRequiredService<ISafeModeService>();
                        safeMode.ActivateSafeMode(10);
                        var eventLog = scope.ServiceProvider.GetRequiredService<IWindowsEventLogService>();
                        eventLog.WriteEvent(1001, "Safe mode activated due to repeated crashes", EventLogEntryType.Warning);
                    }
                }

                await host.RunAsync();
                return 0;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[CRITICAL] Agent crashed: {ex.Message}");
                Console.ResetColor();
                return 1;
            }
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .UseWindowsService(options =>
                {
                    options.ServiceName = ServiceName;
                })
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    // 1. Embedded / base directory configuration
                    var baseDir = AppContext.BaseDirectory;
                    var defaultAppSettings = Path.Combine(baseDir, "appsettings.json");
                    if (File.Exists(defaultAppSettings))
                    {
                        config.AddJsonFile(defaultAppSettings, optional: true, reloadOnChange: true);
                    }

                    // 2. LocalAppData and CommonApplicationData overrides
                    var commonAppDataNos = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS", "appsettings.json");
                    if (File.Exists(commonAppDataNos))
                    {
                        config.AddJsonFile(commonAppDataNos, optional: true, reloadOnChange: true);
                    }

                    var localAppDataNos = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOS", "appsettings.json");
                    if (File.Exists(localAppDataNos))
                    {
                        config.AddJsonFile(localAppDataNos, optional: true, reloadOnChange: true);
                    }

                    // 3. Environment variables & command-line arguments
                    config.AddEnvironmentVariables("NOS_");
                    config.AddCommandLine(args);
                })
                .ConfigureLogging((hostContext, logging) =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();
                    if (OperatingSystem.IsWindows())
                    {
                        logging.AddEventLog(settings =>
                        {
                            settings.SourceName = "NOS-Agent";
                            settings.LogName = "Application";
                        });
                    }
                })
                .ConfigureServices((hostContext, services) =>
                {
                    var config = ConfigurationLoader.Load(hostContext.Configuration);
                    services.Configure<AgentConfiguration>(options =>
                    {
                        options.ServerUrl = config.ServerUrl;
                        options.DeviceId = config.DeviceId;
                        options.TenantId = config.TenantId;
                        options.ApiKey = config.ApiKey;
                        options.HeartbeatIntervalSeconds = config.HeartbeatIntervalSeconds;
                        options.TelemetryIntervalSeconds = config.TelemetryIntervalSeconds;
                        options.InventoryIntervalSeconds = config.InventoryIntervalSeconds;
                        options.SecurityScanIntervalSeconds = config.SecurityScanIntervalSeconds;
                        options.MaxCpuPercent = config.MaxCpuPercent;
                        options.MaxRamMb = config.MaxRamMb;
                        options.MaxConcurrentCollections = config.MaxConcurrentCollections;
                        options.EnableOfflineQueue = config.EnableOfflineQueue;
                        options.EnableSelfThrottling = config.EnableSelfThrottling;
                        options.EnableWindowsEventLog = config.EnableWindowsEventLog;
                        options.LogRetentionDays = config.LogRetentionDays;
                        options.SqliteDbPath = config.SqliteDbPath;
                        options.ResourceGuardrails = config.ResourceGuardrails;
                    });

                    // Database storage in LocalAppData
                    var dbPath = !string.IsNullOrWhiteSpace(config.SqliteDbPath)
                        ? config.SqliteDbPath
                        : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOS", "outbox.db");

                    services.AddDbContext<OutboxDbContext>(options =>
                        options.UseSqlite($"Data Source={dbPath}"));

                    services.AddSingleton<IWindowsEventLogService, WindowsEventLogService>();
                    services.AddSingleton<ICredentialManagerService, CredentialManagerService>();
                    services.AddSingleton<IOutboxQueueService, OutboxQueueService>();
                    services.AddSingleton<ISafeModeService, SafeModeService>();

                    services.AddHttpClient();
                    services.AddHostedService<DeviceRegistrationService>();
                    services.AddHostedService<HeartbeatCollector>();
                    services.AddHostedService<TelemetryCollector>();
                    services.AddHostedService<OutboxDispatcherService>();

                    services.AddSingleton<IResourceMonitorService, ResourceMonitorService>();
                    services.AddHostedService<ResourceMonitorService>();

                    services.AddHostedService<OutboxPressureMonitor>();
                    services.AddHostedService<AgentResourceMonitor>();
                });

        private static void PrintBanner()
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine(@"
 ╦╔═╔═╗  ╔═╗╔═╗╔═╗╔╗╔╔╦╗
 ║║║╚═╗  ╠═╣║ ╦║╣ ║║║ ║ 
 ╩╝╚╚═╝  ╩ ╩╚═╝╚═╝╝╚╝ ╩ 
 Neural Operating System (NOS) Telemetry Daemon
 Version: 1.0.0 (win-x64 Standalone Executable)
");
            Console.ResetColor();
        }

        private static void PrintHelp()
        {
            PrintBanner();
            Console.WriteLine("USAGE:");
            Console.WriteLine("  NOS.Agent.exe [command] [options]\n");
            Console.WriteLine("COMMANDS:");
            Console.WriteLine("  --console               Run interactively in foreground console mode (default)");
            Console.WriteLine("  --register, -r          Register device with control plane (--key <key> [--url <url>])");
            Console.WriteLine("  --install               Register and configure as automated Windows Service");
            Console.WriteLine("  --uninstall             Stop and remove the Windows Service");
            Console.WriteLine("  --start                 Start the installed Windows Service");
            Console.WriteLine("  --stop                  Stop the installed Windows Service");
            Console.WriteLine("  --help, -h              Display this help menu\n");
            Console.WriteLine("OPTIONS:");
            Console.WriteLine("  --server-url, --url     Override backend control plane URL (default: http://nos.is-local.org/api/v1)");
            Console.WriteLine("  --key, -k               Enrollment / Registration key from dashboard");
            Console.WriteLine("  --tenant-id <id>        Set organization/tenant ID (default: default-org)");
            Console.WriteLine("  --device-id <id>        Set pre-provisioned device UUID (optional)\n");
            Console.WriteLine("PERSISTENT STORAGE:");
            Console.WriteLine("  Credentials & ID:       %ProgramData%\\NOS\\device.json and %LOCALAPPDATA%\\NOS\\device.json");
            Console.WriteLine("  Encrypted DPAPI Token:  token.dat (protected via LocalMachine / CurrentUser DPAPI)");
            Console.WriteLine("  Offline Outbox Queue:   outbox.db\n");
        }

        private static int InstallService()
        {
            var exePath = Process.GetCurrentProcess().MainModule?.FileName ?? Environment.ProcessPath;
            if (string.IsNullOrEmpty(exePath))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Could not determine executable path.");
                Console.ResetColor();
                return 1;
            }

            Console.WriteLine($"[INFO] Registering Windows Service: '{ServiceName}'...");
            RunProcess("sc.exe", $"create \"{ServiceName}\" binPath= \"\\\"{exePath}\\\"\" start= auto DisplayName= \"{ServiceDisplayName}\"");
            RunProcess("sc.exe", $"description \"{ServiceName}\" \"Autonomous endpoint telemetry and health monitoring daemon for NOS platform.\"");
            RunProcess("sc.exe", $"start \"{ServiceName}\"");

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[SUCCESS] Windows Service '{ServiceName}' installed and started successfully!");
            Console.ResetColor();
            return 0;
        }

        private static int UninstallService()
        {
            Console.WriteLine($"[INFO] Removing Windows Service: '{ServiceName}'...");
            RunProcess("sc.exe", $"stop \"{ServiceName}\"");
            RunProcess("sc.exe", $"delete \"{ServiceName}\"");

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[SUCCESS] Windows Service '{ServiceName}' removed successfully.");
            Console.ResetColor();
            return 0;
        }

        private static int StartService()
        {
            Console.WriteLine($"[INFO] Starting service '{ServiceName}'...");
            return RunProcess("sc.exe", $"start \"{ServiceName}\"");
        }

        private static int StopService()
        {
            Console.WriteLine($"[INFO] Stopping service '{ServiceName}'...");
            return RunProcess("sc.exe", $"stop \"{ServiceName}\"");
        }

        private static int RunProcess(string filename, string arguments)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = filename,
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var proc = Process.Start(psi);
                if (proc == null) return 1;

                proc.WaitForExit();
                var output = proc.StandardOutput.ReadToEnd();
                var error = proc.StandardError.ReadToEnd();

                if (!string.IsNullOrWhiteSpace(output)) Console.WriteLine(output.Trim());
                if (!string.IsNullOrWhiteSpace(error)) Console.WriteLine(error.Trim());

                return proc.ExitCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed executing {filename} {arguments}: {ex.Message}");
                return 1;
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // FIRST-RUN INTERACTIVE SETUP WIZARD
        // Fires when no token is stored (fresh install on any Windows PC)
        // ═══════════════════════════════════════════════════════════════
        private static async Task RunFirstTimeSetupAsync()
        {
            var nosDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOS");
            var commonDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS");
            var deviceJsonPath = Path.Combine(nosDir, "device.json");
            var commonDeviceJsonPath = Path.Combine(commonDir, "device.json");

            // If device.json exists and has content, agent was previously registered — skip wizard
            if ((File.Exists(deviceJsonPath) && new FileInfo(deviceJsonPath).Length > 10) ||
                (File.Exists(commonDeviceJsonPath) && new FileInfo(commonDeviceJsonPath).Length > 10))
            {
                return; // Already set up on this PC
            }

            // ── Wizard UI ──────────────────────────────────────────────
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine();
            Console.WriteLine(" ╔══════════════════════════════════════════════════════╗");
            Console.WriteLine(" ║       NOS AGENT — FIRST RUN SETUP WIZARD            ║");
            Console.WriteLine(" ╚══════════════════════════════════════════════════════╝");
            Console.ResetColor();
            Console.WriteLine();
            Console.WriteLine(" This agent needs to connect to your NOS server.");
            Console.WriteLine(" You will need a Registration Key from your admin dashboard.");
            Console.WriteLine();

            await ExecuteRegistrationAsync(null, null);
        }

        private static async Task<int> ExecuteRegistrationAsync(string? registrationKey, string? serverUrl)
        {
            var nosDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOS");
            var commonDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS");
            var configPath = Path.Combine(nosDir, "appsettings.json");
            var commonConfigPath = Path.Combine(commonDir, "appsettings.json");
            var deviceJsonPath = Path.Combine(nosDir, "device.json");
            var commonDeviceJsonPath = Path.Combine(commonDir, "device.json");

            const string defaultServer = "http://nos.is-local.org/api/v1";

            // Determine Server URL
            if (string.IsNullOrWhiteSpace(serverUrl))
            {
                if (Environment.UserInteractive && !Console.IsInputRedirected)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.Write($" Server URL [{defaultServer}]: ");
                    Console.ResetColor();
                    var serverInput = Console.ReadLine()?.Trim();
                    serverUrl = string.IsNullOrEmpty(serverInput) ? defaultServer : serverInput;
                }
                else
                {
                    serverUrl = defaultServer;
                }
            }
            serverUrl = serverUrl.TrimEnd('/');

            // Determine Registration Key
            if (string.IsNullOrWhiteSpace(registrationKey))
            {
                if (Environment.UserInteractive && !Console.IsInputRedirected)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.Write(" Registration Key: ");
                    Console.ResetColor();
                    registrationKey = ReadPasswordLine();
                }
            }

            if (string.IsNullOrWhiteSpace(registrationKey))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine(" [!] No registration key provided. Aborting registration.");
                Console.ResetColor();
                return 1;
            }

            // ── Connect & Register ─────────────────────────────────────
            Console.WriteLine();
            Console.WriteLine($" Connecting to {serverUrl} and registering device...");

            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };

                var registerEndpoint = serverUrl.EndsWith("/api/v1", StringComparison.OrdinalIgnoreCase)
                    ? $"{serverUrl}/device/register"
                    : $"{serverUrl}/api/v1/device/register";

                var payload = new
                {
                    uuid = Guid.NewGuid().ToString(),
                    deviceName = Environment.MachineName,
                    hostname = Environment.MachineName,
                    os = GetOsDescription(),
                    osVersion = Environment.OSVersion.Version.ToString(),
                    architecture = RuntimeInformation.ProcessArchitecture.ToString(),
                    agentVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
                    registrationKey
                };

                using var resp = await http.PostAsJsonAsync(registerEndpoint, payload);

                if (!resp.IsSuccessStatusCode)
                {
                    var errBody = await resp.Content.ReadAsStringAsync();
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($" [✗] Registration failed ({(int)resp.StatusCode}): {errBody}");
                    Console.ResetColor();
                    return 1;
                }

                // Parse response
                using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync());
                var root = doc.RootElement;
                var data = root.TryGetProperty("data", out var d) ? d : root;

                var deviceId = data.TryGetProperty("deviceId", out var did) ? did.GetString() : null;
                var token = data.TryGetProperty("token", out var tok)
                    ? tok.GetString()
                    : data.TryGetProperty("registrationToken", out var rt) ? rt.GetString() : null;

                if (string.IsNullOrEmpty(deviceId) || string.IsNullOrEmpty(token))
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine(" [✗] Server response missing deviceId or token.");
                    Console.ResetColor();
                    return 1;
                }

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($" [✓] Device registered successfully!");
                Console.WriteLine($"     Device ID: {deviceId}");
                Console.WriteLine($"     Server:    {serverUrl}");
                Console.ResetColor();

                // ── Ensure target directories exist ────────────────────
                if (!Directory.Exists(nosDir)) Directory.CreateDirectory(nosDir);
                try { if (!Directory.Exists(commonDir)) Directory.CreateDirectory(commonDir); } catch { }

                // Save overriding appsettings to %LOCALAPPDATA%\NOS\ and %ProgramData%\NOS\
                var configObj = new
                {
                    AgentConfiguration = new
                    {
                        ServerUrl = serverUrl,
                        DeviceId = deviceId,
                        TenantId = string.Empty,
                        ApiKey = registrationKey,
                    }
                };
                var configJson = JsonSerializer.Serialize(configObj, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(configPath, configJson);
                try { File.WriteAllText(commonConfigPath, configJson); } catch { }

                // Save device.json for future quick-start detection
                var deviceInfo = new
                {
                    DeviceId = deviceId,
                    ServerUrl = serverUrl,
                    Hostname = Environment.MachineName,
                    RegisteredAt = DateTime.UtcNow.ToString("o")
                };
                var deviceJson = JsonSerializer.Serialize(deviceInfo, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(deviceJsonPath, deviceJson);
                try { File.WriteAllText(commonDeviceJsonPath, deviceJson); } catch { }

                // Store token in Windows Credential Manager and encrypted file
                CredentialManagerService.WriteToken(token, deviceId);

                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine(" [✓] Configuration and credentials saved securely.");
                Console.ResetColor();
                Console.WriteLine();
                return 0;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($" [✗] Registration error: {ex.Message}");
                Console.ResetColor();
                return 1;
            }
        }

        private static string GetOsDescription()
        {
            try
            {
                if (OperatingSystem.IsWindows())
                {
                    using var searcher = new System.Management.ManagementObjectSearcher("SELECT Caption FROM Win32_OperatingSystem");
                    var os = searcher.Get().Cast<System.Management.ManagementObject>().FirstOrDefault();
                    if (os != null) return os["Caption"]?.ToString() ?? "Windows";
                }
            }
            catch { }
            return RuntimeInformation.OSDescription;
        }

        private static string ReadPasswordLine()
        {
            if (Console.IsInputRedirected)
            {
                return Console.ReadLine()?.Trim() ?? string.Empty;
            }

            var sb = new System.Text.StringBuilder();
            while (true)
            {
                var key = Console.ReadKey(intercept: true);
                if (key.Key == ConsoleKey.Enter) break;
                if (key.Key == ConsoleKey.Backspace)
                {
                    if (sb.Length > 0) { sb.Remove(sb.Length - 1, 1); Console.Write("\b \b"); }
                }
                else
                {
                    sb.Append(key.KeyChar);
                    Console.Write('*');
                }
            }
            Console.WriteLine();
            return sb.ToString();
        }
    }
}