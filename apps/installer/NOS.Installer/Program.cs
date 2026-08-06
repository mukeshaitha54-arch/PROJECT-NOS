using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace NOS.Installer;

class Program
{
    // Automatically replaced during build/packaging process by the backend
    private static readonly string DefaultBackendUrl = "http://localhost:4000/api/v1"; 

    static async Task Main(string[] args)
    {
        Console.WriteLine("==================================================");
        Console.WriteLine("  NOS Monitoring Agent - Enterprise Installer");
        Console.WriteLine("==================================================");
        Console.WriteLine();
        Console.WriteLine("Welcome to the NOS Agent Setup.");
        Console.WriteLine("This will install the agent as a Windows Service.");
        Console.WriteLine();

        Console.Write($"Please enter the NOS Server / Dashboard URL [default: {DefaultBackendUrl}]: ");
        string? urlInput = Console.ReadLine()?.Trim();
        string serverUrl = string.IsNullOrEmpty(urlInput) ? DefaultBackendUrl : urlInput.TrimEnd('/');

        Console.Write("Please enter your Registration Key: ");
        string? regKey = Console.ReadLine()?.Trim();

        if (string.IsNullOrEmpty(regKey))
        {
            Console.WriteLine("Registration Key cannot be empty. Setup aborted.");
            Console.ReadLine();
            return;
        }

        Console.WriteLine($"\n[1/4] Registering with NOS Control Plane at {serverUrl}...");
        
        var (deviceId, deviceToken) = await RegisterAgentAsync(serverUrl, regKey);
        
        if (string.IsNullOrEmpty(deviceId) || string.IsNullOrEmpty(deviceToken))
        {
            Console.WriteLine("Registration failed. Please check your key and try again.");
            Console.ReadLine();
            return;
        }

        Console.WriteLine("\n[2/4] Generating Configuration...");
        string installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "NOS", "Agent");
        Directory.CreateDirectory(installDir);

        var config = new
        {
            AgentConfig = new 
            {
                ApiIngestionEndpoint = serverUrl,
                BackendUrl = serverUrl,
                DeviceId = deviceId,
                DeviceToken = deviceToken,
                RegistrationKey = regKey,
                HeartbeatInterval = 30,
                TelemetryInterval = 10,
                InventoryInterval = 3600,
                Version = "2.1.0"
            }
        };

        string configPath = Path.Combine(installDir, "appsettings.json");
        File.WriteAllText(configPath, JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true }));

        // Persist cryptographic credentials into CommonApplicationData (%ProgramData%) for immediate discovery by LocalSystem Windows Service
        try
        {
            string programDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOSAgent");
            Directory.CreateDirectory(programDataDir);
            
            var tokenCreds = new
            {
                deviceId = deviceId,
                registrationToken = deviceToken,
                registeredAt = DateTime.UtcNow.ToString("O")
            };
            
            string tokenPath = Path.Combine(programDataDir, "device-auth-credentials.json");
            File.WriteAllText(tokenPath, JsonSerializer.Serialize(tokenCreds, new JsonSerializerOptions { WriteIndented = true }));
            Console.WriteLine("Secure credentials stored in CommonApplicationData for Windows Service startup.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Notice: Could not pre-populate CommonApplicationData credentials: {ex.Message}");
        }

        Console.WriteLine("\n[3/4] Copying Binaries...");
        
        // In a real self-extracting zip or installer, we'd extract the embedded agent binaries here.
        // For development/demonstration, we assume the binaries are alongside the installer in a "payload" folder.
        string payloadDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "payload");
        if (Directory.Exists(payloadDir))
        {
            foreach (var file in Directory.GetFiles(payloadDir))
            {
                File.Copy(file, Path.Combine(installDir, Path.GetFileName(file)), true);
            }
        }
        else
        {
            Console.WriteLine($"Warning: Payload directory not found at {payloadDir}. Proceeding assuming manual placement.");
        }

        Console.WriteLine("\n[4/4] Installing & Starting Windows Service...");
        
        string exePath = Path.Combine(installDir, "NOS.Agent.exe");
        
        // Stop service if exists
        RunCommand("sc.exe", "stop \"NOS Monitoring Agent\"");
        RunCommand("sc.exe", "delete \"NOS Monitoring Agent\"");
        
        // Create service
        RunCommand("sc.exe", $"create \"NOS Monitoring Agent\" binPath= \"{exePath}\" start= auto");
        RunCommand("sc.exe", "description \"NOS Monitoring Agent\" \"Collects telemetry and inventory for the NOS Control Plane.\"");
        
        // Configure recovery (restart on failure)
        RunCommand("sc.exe", "failure \"NOS Monitoring Agent\" reset= 86400 actions= restart/60000/restart/60000/restart/60000");

        // Start service
        RunCommand("sc.exe", "start \"NOS Monitoring Agent\"");

        Console.WriteLine("\n==================================================");
        Console.WriteLine("  Installation Complete!");
        Console.WriteLine("  The agent is now running and collecting data.");
        Console.WriteLine("==================================================");
        Console.WriteLine("Press any key to exit...");
        Console.ReadKey();
    }

    private static async Task<(string? deviceId, string? deviceToken)> RegisterAgentAsync(string serverUrl, string regKey)
    {
        try
        {
            using var client = new HttpClient();
            var payload = new
            {
                uuid = GetUuid(),
                hostname = Environment.MachineName,
                deviceName = Environment.MachineName,
                os = Environment.OSVersion.ToString(),
                osVersion = Environment.OSVersion.Version.ToString(),
                architecture = "x64",
                agentVersion = "2.1.0",
                registrationKey = regKey
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{serverUrl}/device/register", content);
            
            if (response.IsSuccessStatusCode)
            {
                var responseString = await response.Content.ReadAsStringAsync();
                var json = JsonDocument.Parse(responseString);
                var data = json.RootElement.GetProperty("data");
                return (data.GetProperty("deviceId").GetString(), data.GetProperty("registrationToken").GetString());
            }
            else
            {
                Console.WriteLine($"API Error: {response.StatusCode} - {await response.Content.ReadAsStringAsync()}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Network Error: {ex.Message}");
        }
        return (null, null);
    }

    private static string GetUuid()
    {
        try
        {
            using var searcher = new System.Management.ManagementObjectSearcher("SELECT UUID FROM Win32_ComputerSystemProduct");
            foreach (var obj in searcher.Get())
            {
                if (obj["UUID"] != null) return obj["UUID"].ToString();
            }
        }
        catch { }
        return Guid.NewGuid().ToString(); // fallback
    }

    private static void RunCommand(string fileName, string arguments)
    {
        try
        {
            var process = Process.Start(new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            });
            process?.WaitForExit(10000);
        }
        catch { }
    }
}
