using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
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

                    // 2. LocalAppData overrides (%LOCALAPPDATA%\NOS\appsettings.json)
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
            Console.WriteLine("  --install               Register and configure as automated Windows Service");
            Console.WriteLine("  --uninstall             Stop and remove the Windows Service");
            Console.WriteLine("  --start                 Start the installed Windows Service");
            Console.WriteLine("  --stop                  Stop the installed Windows Service");
            Console.WriteLine("  --help, -h              Display this help menu\n");
            Console.WriteLine("OPTIONS:");
            Console.WriteLine("  --server-url <url>      Override the backend control plane URL (default: http://localhost:3001)");
            Console.WriteLine("  --tenant-id <id>        Set organization/tenant ID (default: default-org)");
            Console.WriteLine("  --device-id <id>        Set pre-provisioned device UUID (optional)\n");
            Console.WriteLine("PERSISTENT STORAGE:");
            Console.WriteLine("  Credentials & ID:       %LOCALAPPDATA%\\NOS\\device.json");
            Console.WriteLine("  Encrypted DPAPI Token:  %LOCALAPPDATA%\\NOS\\token.dat");
            Console.WriteLine("  Offline Outbox Queue:   %LOCALAPPDATA%\\NOS\\outbox.db\n");
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
    }
}