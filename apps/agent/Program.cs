using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NOS.Agent.Services;
using NOS.Agent.Workers;

var builder = Host.CreateDefaultBuilder(args)
    .ConfigureServices((hostContext, services) =>
    {
        // Bind enterprise Clean Architecture agent services
        services.AddSingleton<IMetricsService, MetricsService>(); // Retained for backwards compatibility
        services.AddSingleton<ISystemDiagnosticsService, SystemDiagnosticsService>();
        services.AddSingleton<ITokenStorageService, TokenStorageService>();
        services.AddSingleton<IInventoryDiscoveryService, InventoryDiscoveryService>();
        
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
    });

var host = builder.Build();
await host.RunAsync();
