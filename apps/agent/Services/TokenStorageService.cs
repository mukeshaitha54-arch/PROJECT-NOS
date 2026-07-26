using System.Text.Json;
using Microsoft.Extensions.Logging;
using NOS.Agent.Models;

namespace NOS.Agent.Services;

public class TokenStorageService : ITokenStorageService
{
    private readonly ILogger<TokenStorageService> _logger;
    private readonly string _tokenFilePath;
    private readonly string _uuidFilePath;

    public TokenStorageService(ILogger<TokenStorageService> logger)
    {
        _logger = logger;
        var appDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOSAgent");
        Directory.CreateDirectory(appDataFolder);

        _tokenFilePath = Path.Combine(appDataFolder, "device-auth-credentials.json");
        _uuidFilePath = Path.Combine(appDataFolder, "stable-machine-uuid.dat");
    }

    public async Task<TokenCredentials?> GetCredentialsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (!File.Exists(_tokenFilePath))
                return null;

            var json = await File.ReadAllTextAsync(_tokenFilePath, cancellationToken);
            return JsonSerializer.Deserialize<TokenCredentials>(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read stored device token credentials from [{Path}]. Assuming agent requires re-registration.", _tokenFilePath);
            return null;
        }
    }

    public async Task SaveCredentialsAsync(TokenCredentials credentials, CancellationToken cancellationToken = default)
    {
        try
        {
            var json = JsonSerializer.Serialize(credentials, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_tokenFilePath, json, cancellationToken);
            _logger.LogInformation("🔒 Secure cryptographic registration credentials preserved locally in [{Path}].", _tokenFilePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to persist token credentials to disk storage at [{Path}].", _tokenFilePath);
            throw;
        }
    }

    public Task ClearCredentialsAsync(CancellationToken cancellationToken = default)
    {
        if (File.Exists(_tokenFilePath))
        {
            File.Delete(_tokenFilePath);
            _logger.LogInformation("Deleted previously cached credentials at [{Path}].", _tokenFilePath);
        }
        return Task.CompletedTask;
    }

    public string GetOrCreateStableMachineUuid()
    {
        try
        {
            if (File.Exists(_uuidFilePath))
            {
                var id = File.ReadAllText(_uuidFilePath).Trim();
                if (Guid.TryParse(id, out _))
                    return id;
            }

            var newUuid = Guid.NewGuid().ToString();
            File.WriteAllText(_uuidFilePath, newUuid);
            return newUuid;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not persist stable GUID to file. Deriving fallback UUID from host machine details.");
            return Guid.NewGuid().ToString();
        }
    }
}
