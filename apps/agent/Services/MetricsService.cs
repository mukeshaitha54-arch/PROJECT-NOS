using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services;

public class MetricsService : IMetricsService
{
    private readonly ILogger<MetricsService> _logger;

    public MetricsService(ILogger<MetricsService> logger)
    {
        _logger = logger;
    }

    public Task<string> GetSystemHealthDiagnosticAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Sampling foundation diagnostic metrics stub...");
        // Placeholder return payload without domain telemetry features implementation
        return Task.FromResult("STATUS_OK_FOUNDATION_STUB");
    }
}
