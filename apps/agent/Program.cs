using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NOS.Agent.Services;
using NOS.Agent.Workers;
using System.Runtime.InteropServices;
using System;

var builder = Host.CreateDefaultBuilder(args)
    .UseWindowsService(options =>
    {
        options.ServiceName = "NOS Monitoring Agent";
    })
    .ConfigureServices((hostContext, services) =>
    {
        // Bind platform-appropriate metric collector per Clean Architecture
        if (Environment.GetEnvironmentVariable("NOS_AGENT_SIMULATION_MODE") == "true")
        {
            services.AddSingleton<IMetricCollector, SimulationMetricCollector>();
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            services.AddSingleton<IMetricCollector, WindowsMetricCollector>();
        }
        else
        {
            services.AddSingleton<IMetricCollector, LinuxMetricCollector>();
        }

        // Bind enterprise Clean Architecture agent services
        services.AddSingleton<IMetricsService, MetricsService>(); // Retained for backwards compatibility
        services.AddSingleton<ISystemDiagnosticsService, SystemDiagnosticsService>();
        services.AddSingleton<ITokenStorageService, TokenStorageService>();
        services.AddSingleton<IInventoryDiscoveryService, InventoryDiscoveryService>();
        services.AddSingleton<IOfflineBufferService, OfflineBufferService>();
        services.AddSingleton<ICollectorSchedulerService, CollectorSchedulerService>();
        
        services.AddHttpClient("NOSAgentClient");

        // Register core background telemetry, heartbeat, and Phase 3 inventory workers
        services.AddHostedService<TelemetryCollectorWorker>();
        services.AddHostedService<InventoryCollectorWorker>();
    })
    .ConfigureLogging((hostContext, logging) =>
    {
        logging.ClearProviders();
        logging.AddConsole();
        logging.AddDebug();
        // Event log is automatically added by UseWindowsService if running as a service
    });

var host = builder.Build();
await host.RunAsync();
