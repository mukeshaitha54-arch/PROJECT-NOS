using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public interface ICredentialManagerService
    {
        Task<string?> GetDeviceTokenAsync();
        Task SetDeviceTokenAsync(string token);
    }
}
