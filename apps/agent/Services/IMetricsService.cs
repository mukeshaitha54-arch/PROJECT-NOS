namespace NOS.Agent.Services;

/// <summary>
/// Infrastructure contract for system hardware and networking diagnostics sampling.
/// Business implementation details postponed to application features phase.
/// </summary>
public interface IMetricsService
{
    Task<string> GetSystemHealthDiagnosticAsync(CancellationToken cancellationToken = default);
}
