using System;
using System.Linq;
using System.Management;
using System.Net.Http;
using System.Net.Http.Json;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services
{
    public class DeviceRegistrationService : BackgroundService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DeviceRegistrationService> _logger;
        
        public static string? CurrentToken { get; private set; }

        public DeviceRegistrationService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<DeviceRegistrationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var deviceId = _configuration["AgentConfiguration:DeviceId"];
            var needsRegistration = string.IsNullOrWhiteSpace(deviceId) || deviceId == "test-device-01";

            if (!needsRegistration)
            {
                var token = CredentialManager.ReadCredential("NOS_Agent_Token");
                if (string.IsNullOrEmpty(token))
                {
                    _logger.LogWarning("DeviceId exists in config but token is missing from Credential Manager. Attempting re-registration.");
                    needsRegistration = true;
                }
                else
                {
                    CurrentToken = token;
                    _logger.LogInformation("Agent initialized with DeviceId: {DeviceId}", deviceId);
                    return;
                }
            }

            int retryCount = 0;
            while (!stoppingToken.IsCancellationRequested && needsRegistration)
            {
                try
                {
                    var machineInfo = CollectMachineInfo();
                    var serverUrl = _configuration["AgentConfiguration:ServerUrl"]?.TrimEnd('/');
                    var registerUrl = $"{serverUrl}/device/register";

                    _logger.LogInformation("Attempting registration with {ServerUrl}", serverUrl);

                    using var client = _httpClientFactory.CreateClient();
                    var response = await client.PostAsJsonAsync(registerUrl, machineInfo, stoppingToken);

                    if (response.IsSuccessStatusCode)
                    {
                        var wrapper = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<RegistrationResponse>>(cancellationToken: stoppingToken);
                        var result = wrapper?.Data;
                        
                        if (result != null && !string.IsNullOrEmpty(result.DeviceId) && (!string.IsNullOrEmpty(result.Token) || !string.IsNullOrEmpty(result.RegistrationToken)))
                        {
                            var token = result.Token ?? result.RegistrationToken!;
                            
                            // Store in Credential Manager
                            CredentialManager.WriteCredential("NOS_Agent_Token", result.DeviceId, token);
                            CurrentToken = token;

                            // Update appsettings.json
                            UpdateAppsettings(result.DeviceId);

                            _logger.LogInformation("Successfully registered device. DeviceId: {DeviceId}", result.DeviceId);
                            needsRegistration = false;
                            break;
                        }
                        else
                        {
                            _logger.LogError("Registration response missing DeviceId or Token. Response: {Response}", await response.Content.ReadAsStringAsync(stoppingToken));
                        }
                    }
                    else
                    {
                        _logger.LogError("Registration failed with status code {StatusCode}. Content: {Content}", response.StatusCode, await response.Content.ReadAsStringAsync(stoppingToken));
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Exception occurred during registration.");
                }

                retryCount++;
                var delay = retryCount > 10 ? TimeSpan.FromMinutes(5) : TimeSpan.FromSeconds(60);
                _logger.LogInformation("Retrying registration in {Delay}", delay);
                await Task.Delay(delay, stoppingToken);
            }
        }

        private object CollectMachineInfo()
        {
            string osCaption = "Unknown";
            string osVersion = "Unknown";
            
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT Caption, Version FROM Win32_OperatingSystem");
                var osInfo = searcher.Get().Cast<ManagementObject>().FirstOrDefault();
                if (osInfo != null)
                {
                    osCaption = osInfo["Caption"]?.ToString() ?? "Unknown";
                    osVersion = osInfo["Version"]?.ToString() ?? "Unknown";
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to collect OS info via WMI.");
            }

            return new
            {
                uuid = Guid.NewGuid().ToString(),
                deviceName = Environment.MachineName,
                hostname = Environment.MachineName,
                os = osCaption,
                osVersion = osVersion,
                architecture = RuntimeInformation.ProcessArchitecture.ToString(),
                agentVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0"
            };  
        }

        private void UpdateAppsettings(string newDeviceId)
        {
            try
            {
                var filePath = System.IO.Path.Combine(AppContext.BaseDirectory, "appsettings.json");
                if (System.IO.File.Exists(filePath))
                {
                    var json = System.IO.File.ReadAllText(filePath);
                    var node = System.Text.Json.Nodes.JsonNode.Parse(json);
                    if (node != null && node["AgentConfiguration"] != null)
                    {
                        node["AgentConfiguration"]!["DeviceId"] = newDeviceId;
                        System.IO.File.WriteAllText(filePath, node.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update appsettings.json with new DeviceId.");
            }
        }

        private class ApiResponseWrapper<T>
        {
            public bool Success { get; set; }
            public T? Data { get; set; }
            public string? Message { get; set; }
        }

        private class RegistrationResponse
        {
            public string? DeviceId { get; set; }
            public string? Token { get; set; }
            public string? RegistrationToken { get; set; }
        }
    }

    internal static class CredentialManager
    {
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CredWrite([In] ref CREDENTIAL userCredential, [In] uint flags);

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CredRead(string targetName, uint type, int reservedFlag, out IntPtr credentialPtr);

        [DllImport("advapi32.dll", SetLastError = true)]
        private static extern bool CredFree([In] IntPtr buffer);

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct CREDENTIAL
        {
            public uint Flags;
            public uint Type;
            public string TargetName;
            public string Comment;
            public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
            public uint CredentialBlobSize;
            public IntPtr CredentialBlob;
            public uint Persist;
            public uint AttributeCount;
            public IntPtr Attributes;
            public string TargetAlias;
            public string UserName;
        }

        private const uint CRED_TYPE_GENERIC = 1;
        private const uint CRED_PERSIST_LOCAL_MACHINE = 2;

        public static void WriteCredential(string target, string username, string password)
        {
            var passwordBytes = Encoding.Unicode.GetBytes(password);
            var passPtr = Marshal.AllocCoTaskMem(passwordBytes.Length);
            Marshal.Copy(passwordBytes, 0, passPtr, passwordBytes.Length);

            try
            {
                var cred = new CREDENTIAL
                {
                    Type = CRED_TYPE_GENERIC,
                    TargetName = target,
                    UserName = username,
                    CredentialBlobSize = (uint)passwordBytes.Length,
                    CredentialBlob = passPtr,
                    Persist = CRED_PERSIST_LOCAL_MACHINE
                };

                if (!CredWrite(ref cred, 0))
                {
                    throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                }
            }
            finally
            {
                Marshal.FreeCoTaskMem(passPtr);
            }
        }

        public static string? ReadCredential(string target)
        {
            if (CredRead(target, CRED_TYPE_GENERIC, 0, out IntPtr credPtr))
            {
                try
                {
                    var cred = Marshal.PtrToStructure<CREDENTIAL>(credPtr);
                    if (cred.CredentialBlobSize > 0 && cred.CredentialBlob != IntPtr.Zero)
                    {
                        var bytes = new byte[cred.CredentialBlobSize];
                        Marshal.Copy(cred.CredentialBlob, bytes, 0, bytes.Length);
                        return Encoding.Unicode.GetString(bytes);
                    }
                }
                finally
                {
                    CredFree(credPtr);
                }
            }
            return null;
        }
    }
}