using System;
using System.Diagnostics;
using System.IO;

namespace NOS.Agent.Services
{
    /// <summary>
    /// Handles autonomous, permanent decommissioning of the NOS Agent when deleted from the control plane.
    /// Wipes all local configuration, tokens, outbox databases, removes the Windows Service, and halts the process.
    /// </summary>
    public static class DecommissionManager
    {
        private static bool _isDecommissioning = false;
        private static readonly object _lock = new();

        public static void ExecutePermanentShutdown(string reason = "Administrative decommission signal received from control plane.")
        {
            lock (_lock)
            {
                if (_isDecommissioning) return;
                _isDecommissioning = true;
            }

            try
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("\n╔═══════════════════════════════════════════════════════════════════════╗");
                Console.WriteLine("║            PERMANENT AGENT DECOMMISSION SIGNAL DETECTED             ║");
                Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════╝");
                Console.WriteLine($" [!] Reason: {reason}");
                Console.WriteLine(" [*] Purging local credentials, identity tokens, and outbox queues...");
                Console.ResetColor();

                // 1. Purge credentials and tokens from LocalAppData, ProgramData, and Application directory
                PurgeDirectory(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOS"));
                PurgeDirectory(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS"));
                PurgeDirectory(AppContext.BaseDirectory);

                // Purge Windows Credential Manager if present
                if (OperatingSystem.IsWindows())
                {
                    try
                    {
                        CredentialManagerService.ClearToken();
                    }
                    catch { }
                }

                // 2. Spawn a detached background process to stop and delete the Windows Service and terminate lingering processes
                if (OperatingSystem.IsWindows())
                {
                    try
                    {
                        Console.WriteLine(" [*] Unregistering 'NOS Agent' Windows Service and cleaning process tree...");
                        var psi = new ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = "/c timeout /t 2 /nobreak > NUL & sc.exe stop \"NOS Agent\" & sc.exe delete \"NOS Agent\" & taskkill /F /IM NOS-Agent.exe /T & taskkill /F /IM NOS.Agent.exe /T",
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            WindowStyle = ProcessWindowStyle.Hidden
                        };
                        Process.Start(psi);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[ERROR] Failed to launch detached service uninstaller: {ex.Message}");
                    }
                }

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine(" [✓] Decommission complete. Terminating NOS Agent process permanently.");
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error during decommission execution: {ex.Message}");
            }
            finally
            {
                Environment.Exit(0);
            }
        }

        private static void PurgeDirectory(string path)
        {
            try
            {
                if (!Directory.Exists(path)) return;

                var filesToDelete = new[]
                {
                    "device.json",
                    "token.dat",
                    "outbox.db",
                    "outbox.db-shm",
                    "outbox.db-wal"
                };

                foreach (var file in filesToDelete)
                {
                    var fullPath = Path.Combine(path, file);
                    if (File.Exists(fullPath))
                    {
                        try { File.Delete(fullPath); } catch { }
                    }
                }
            }
            catch { }
        }
    }
}
