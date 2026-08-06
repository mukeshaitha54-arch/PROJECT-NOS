using System;
using System.Net.Http;
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
        public static void Main(string[] args)
        {
            var host = CreateHostBuilder(args).Build();
            host.Run();
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
                    });

                    services.AddDbContext<OutboxDbContext>(options =>
                        options.UseSqlite($"Data Source={config.SqliteDbPath}"),
                        ServiceLifetime.Transient);

                    services.AddSingleton<IWindowsEventLogService, WindowsEventLogService>();
                    services.AddSingleton<ICredentialManagerService, CredentialManagerService>();
                    services.AddSingleton<IOutboxQueueService, OutboxQueueService>();
                    
                    services.AddHttpClient();
                    services.AddHostedService<OutboxDispatcherService>();
                    services.AddHostedService<ResourceMonitorService>();
                });
    }
}
