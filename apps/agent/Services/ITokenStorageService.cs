using NOS.Agent.Models;

namespace NOS.Agent.Services;

public interface ITokenStorageService
{
    Task<TokenCredentials?> GetCredentialsAsync(CancellationToken cancellationToken = default);
    Task SaveCredentialsAsync(TokenCredentials credentials, CancellationToken cancellationToken = default);
    Task ClearCredentialsAsync(CancellationToken cancellationToken = default);
    string GetOrCreateStableMachineUuid();
}
