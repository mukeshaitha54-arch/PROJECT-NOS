using NOS.Agent.Models;

namespace NOS.Agent.Services;

public interface IInventoryDiscoveryService
{
    /**
     * Performs an exhaustive hardware, software, network, and security capability diagnostic scan.
     */
    SubmitInventoryPayload DiscoverCompleteInventory(string? deviceId = null);
}
