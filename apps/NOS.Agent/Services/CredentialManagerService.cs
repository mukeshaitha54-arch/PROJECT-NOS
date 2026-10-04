using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace NOS.Agent.Services
{
    public class CredentialManagerService : ICredentialManagerService
    {
        private readonly IConfiguration? _configuration;

        public CredentialManagerService(IConfiguration? configuration = null)
        {
            _configuration = configuration;
        }

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CredRead(string targetName, uint type, int reservedFlag, out IntPtr credentialPtr);

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CredDelete(string targetName, uint type, int reservedFlag);

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CredWrite([In] ref CREDENTIAL userCredential, [In] uint flags);

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
        private const string CredentialTarget = "NOS_Agent_Token";
        private const string LegacyCredentialTarget = "NOS_DeviceToken";

        private static string GetEncryptedTokenPath()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var nosDir = Path.Combine(appData, "NOS");
            if (!Directory.Exists(nosDir))
            {
                Directory.CreateDirectory(nosDir);
            }
            return Path.Combine(nosDir, "token.dat");
        }

        public Task<string?> GetDeviceTokenAsync()
        {
            // 1. Direct configuration / appsettings.json lookup
            try
            {
                var cfgToken = _configuration?["AgentConfiguration:DeviceToken"];
                if (!string.IsNullOrWhiteSpace(cfgToken))
                {
                    return Task.FromResult<string?>(cfgToken.Trim());
                }
            }
            catch { }

            // 2. Local device.json lookup in AppContext, ProgramData, or LocalAppData
            try
            {
                var candidatePaths = new[]
                {
                    Path.Combine(AppContext.BaseDirectory, "device.json"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS", "device.json"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NOS", "device.json")
                };

                foreach (var path in candidatePaths)
                {
                    if (File.Exists(path))
                    {
                        var json = File.ReadAllText(path);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("DeviceToken", out var dt) && !string.IsNullOrWhiteSpace(dt.GetString()))
                            return Task.FromResult<string?>(dt.GetString()!.Trim());
                        if (doc.RootElement.TryGetProperty("Token", out var t) && !string.IsNullOrWhiteSpace(t.GetString()))
                            return Task.FromResult<string?>(t.GetString()!.Trim());
                        if (doc.RootElement.TryGetProperty("RegistrationToken", out var rt) && !string.IsNullOrWhiteSpace(rt.GetString()))
                            return Task.FromResult<string?>(rt.GetString()!.Trim());
                    }
                }
            }
            catch { }

            // 3. Fallback to token.txt in ProgramData or AppContext
            try
            {
                var txtPaths = new[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS", "token.txt"),
                    Path.Combine(AppContext.BaseDirectory, "token.txt")
                };
                foreach (var path in txtPaths)
                {
                    if (File.Exists(path))
                    {
                        var txt = File.ReadAllText(path)?.Trim();
                        if (!string.IsNullOrWhiteSpace(txt) && txt.Length >= 16)
                            return Task.FromResult<string?>(txt);
                    }
                }
            }
            catch { }

            // 4. Windows DPAPI Encrypted File in %ProgramData%\NOS\token.dat (accessible by LocalSystem Windows Service)
            try
            {
                var commonTokenPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS", "token.dat");
                if (File.Exists(commonTokenPath))
                {
                    var encryptedBytes = File.ReadAllBytes(commonTokenPath);
                    var decryptedBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.LocalMachine);
                    var token = Encoding.UTF8.GetString(decryptedBytes);
                    if (!string.IsNullOrWhiteSpace(token))
                    {
                        return Task.FromResult<string?>(token.Trim());
                    }
                }
            }
            catch { }

            // 5. Windows DPAPI Encrypted File in %LOCALAPPDATA%\NOS\token.dat (user process)
            try
            {
                var tokenPath = GetEncryptedTokenPath();
                if (File.Exists(tokenPath))
                {
                    var encryptedBytes = File.ReadAllBytes(tokenPath);
                    var decryptedBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.CurrentUser);
                    var token = Encoding.UTF8.GetString(decryptedBytes);
                    if (!string.IsNullOrWhiteSpace(token))
                    {
                        return Task.FromResult<string?>(token.Trim());
                    }
                }
            }
            catch { }

            // 6. Fallback to Windows Credential Manager
            foreach (var target in new[] { CredentialTarget, LegacyCredentialTarget })
            {
                try
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
                                var token = Encoding.Unicode.GetString(bytes);
                                if (!string.IsNullOrWhiteSpace(token))
                                {
                                    return Task.FromResult<string?>(token.Trim());
                                }
                            }
                        }
                        finally
                        {
                            CredFree(credPtr);
                        }
                    }
                }
                catch { }
            }

            return Task.FromResult<string?>(null);
        }

        public Task SetDeviceTokenAsync(string token)
        {
            WriteToken(token);
            return Task.CompletedTask;
        }

        public Task ClearDeviceTokenAsync()
        {
            ClearToken();
            return Task.CompletedTask;
        }

        public static void ClearToken()
        {
            try
            {
                CredDelete(CredentialTarget, CRED_TYPE_GENERIC, 0);
            }
            catch { }

            try
            {
                CredDelete(LegacyCredentialTarget, CRED_TYPE_GENERIC, 0);
            }
            catch { }

            try
            {
                var tokenPath = GetEncryptedTokenPath();
                if (File.Exists(tokenPath)) File.Delete(tokenPath);
            }
            catch { }

            try
            {
                var commonTokenPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS", "token.dat");
                if (File.Exists(commonTokenPath)) File.Delete(commonTokenPath);
            }
            catch { }

            try
            {
                var commonTxtPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS", "token.txt");
                if (File.Exists(commonTxtPath)) File.Delete(commonTxtPath);
            }
            catch { }
        }

        public static void WriteToken(string token, string? username = "NOS_Device")
        {
            if (string.IsNullOrWhiteSpace(token)) return;

            // 1. Write to Windows Credential Manager under both targets
            foreach (var target in new[] { CredentialTarget, LegacyCredentialTarget })
            {
                try
                {
                    var passwordBytes = Encoding.Unicode.GetBytes(token);
                    var passPtr = Marshal.AllocCoTaskMem(passwordBytes.Length);
                    Marshal.Copy(passwordBytes, 0, passPtr, passwordBytes.Length);

                    try
                    {
                        var cred = new CREDENTIAL
                        {
                            Type = CRED_TYPE_GENERIC,
                            TargetName = target,
                            UserName = username ?? "NOS_Device",
                            CredentialBlobSize = (uint)passwordBytes.Length,
                            CredentialBlob = passPtr,
                            Persist = CRED_PERSIST_LOCAL_MACHINE
                        };
                        CredWrite(ref cred, 0);
                    }
                    finally
                    {
                        Marshal.FreeCoTaskMem(passPtr);
                    }
                }
                catch
                {
                    // Ignore Credential Manager write failure, will save to DPAPI and files
                }
            }

            // 2. Write DPAPI encrypted file in %LOCALAPPDATA%\NOS\token.dat
            try
            {
                var tokenPath = GetEncryptedTokenPath();
                var rawBytes = Encoding.UTF8.GetBytes(token);
                var encryptedBytes = ProtectedData.Protect(rawBytes, null, DataProtectionScope.CurrentUser);
                File.WriteAllBytes(tokenPath, encryptedBytes);
            }
            catch { }

            // 3. Write DPAPI encrypted file in %ProgramData%\NOS\token.dat (LocalMachine scope for services)
            try
            {
                var commonDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS");
                if (!Directory.Exists(commonDir)) Directory.CreateDirectory(commonDir);
                var commonTokenPath = Path.Combine(commonDir, "token.dat");
                var rawBytes = Encoding.UTF8.GetBytes(token);
                var encryptedBytes = ProtectedData.Protect(rawBytes, null, DataProtectionScope.LocalMachine);
                File.WriteAllBytes(commonTokenPath, encryptedBytes);
            }
            catch { }

            // 4. Write plaintext token.txt in %ProgramData%\NOS (fallback for LocalSystem services)
            try
            {
                var commonDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS");
                if (!Directory.Exists(commonDir)) Directory.CreateDirectory(commonDir);
                var commonTxtPath = Path.Combine(commonDir, "token.txt");
                File.WriteAllText(commonTxtPath, token.Trim(), Encoding.UTF8);
            }
            catch { }

            // 5. Update device.json in %ProgramData%\NOS and AppContext.BaseDirectory
            try
            {
                var candidatePaths = new[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "NOS", "device.json"),
                    Path.Combine(AppContext.BaseDirectory, "device.json")
                };
                foreach (var path in candidatePaths)
                {
                    if (File.Exists(path))
                    {
                        var json = File.ReadAllText(path);
                        var node = System.Text.Json.Nodes.JsonNode.Parse(json);
                        if (node != null)
                        {
                            node["DeviceToken"] = token.Trim();
                            File.WriteAllText(path, node.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
                        }
                    }
                }
            }
            catch { }
        }
    }
}