using System.Threading;
using System.Threading.Tasks;
using NOS.Agent.Models;

namespace NOS.Agent.Services;

public interface IInventoryDiscoveryService
{
    /// <summary>
    /// Performs an exhaustive hardware, software, network, and security capability diagnostic scan.
    /// Utilizes real WMI and Windows Registry queries, with 1-hour result caching.
    /// </summary>
    SubmitInventoryPayload DiscoverCompleteInventory(string? deviceId = null);

    /// <summary>
    /// Asynchronously performs unified inventory discovery returning the comprehensive InventoryPayload object.
    /// Uses real WMI and Registry collectors with 1-hour result caching.
    /// </summary>
    Task<InventoryPayload> DiscoverUnifiedInventoryAsync(string? deviceId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Synchronously returns the unified InventoryPayload object.
    /// </summary>
    InventoryPayload DiscoverUnifiedInventory(string? deviceId = null);
}
