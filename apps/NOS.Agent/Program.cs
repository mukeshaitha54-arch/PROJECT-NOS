using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NOS.Agent.Configuration;
using NOS.Agent.Data;
using NOS.Agent.Services;

namespace NOS.Agent
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var host = CreateHostBuilder(args).Build();
            
            try
            {
                if (!System.Diagnostics.EventLog.SourceExists("NOS-Agent"))
                {
                    System.Diagnostics.EventLog.CreateEventSource("NOS-Agent", "Application");
                }
            }
            catch (System.Security.SecurityException)
            {
                // Requires Admin privileges. Ignore for non-admin runs.
            }

            try
            {
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
                        eventLog.WriteEvent(1001, "Safe mode activated due to repeated crashes", System.Diagnostics.EventLogEntryType.Warning);
                    }
                }
                
                host.Run();
            }
            catch (Exception ex)
            {
                try
                {
                    using (var scope = host.Services.CreateScope())
                    {
                        var eventLog = scope.ServiceProvider.GetRequiredService<IWindowsEventLogService>();
                        eventLog.WriteEvent(1003, $"Unhandled exception: {ex.Message}\n{ex.StackTrace}", System.Diagnostics.EventLogEntryType.Error);

                        var dbContext = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();
                        dbContext.CrashLogs.Add(new NOS.Agent.Models.CrashLog
                        {
                            ExceptionType = ex.GetType().Name.Length > 256 ? ex.GetType().Name.Substring(0, 256) : ex.GetType().Name,
                            Message = ex.Message,
                            StackTrace = ex.StackTrace ?? string.Empty
                        });
                        await dbContext.SaveChangesAsync();
                    }
                }
                catch 
                {
                    // Ignore if we can't write the crash log
                }
                throw; // Do not suppress
            }
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .UseWindowsService(options =>
                {
                    options.ServiceName = "NOS Agent";
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

                    var dbPath = Path.Combine(AppContext.BaseDirectory, "outbox.db");
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
                    
                    // New Monitors
                    services.AddHostedService<OutboxPressureMonitor>();
                    services.AddHostedService<AgentResourceMonitor>();
                });
    }
}