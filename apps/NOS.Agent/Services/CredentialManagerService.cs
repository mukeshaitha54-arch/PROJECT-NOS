using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public class CredentialManagerService : ICredentialManagerService
    {
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool CredRead(string targetName, uint type, int reservedFlag, out IntPtr credentialPtr);

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
            // 1. Try Windows Credential Manager
            try
            {
                if (CredRead(CredentialTarget, CRED_TYPE_GENERIC, 0, out IntPtr credPtr))
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
                                return Task.FromResult<string?>(token);
                            }
                        }
                    }
                    finally
                    {
                        CredFree(credPtr);
                    }
                }
            }
            catch
            {
                // Fallback to encrypted file storage
            }

            // 2. Fallback to Windows DPAPI Encrypted File in %LOCALAPPDATA%\NOS\token.dat
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
                        return Task.FromResult<string?>(token);
                    }
                }
            }
            catch
            {
                // Return null if inaccessible
            }

            return Task.FromResult<string?>(null);
        }

        public Task SetDeviceTokenAsync(string token)
        {
            WriteToken(token);
            return Task.CompletedTask;
        }

        public static void WriteToken(string token, string? username = "NOS_Device")
        {
            if (string.IsNullOrWhiteSpace(token)) return;

            // 1. Write to Windows Credential Manager
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
                        TargetName = CredentialTarget,
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
                // Ignore Credential Manager write failure, will save to DPAPI
            }

            // 2. Write DPAPI encrypted file in %LOCALAPPDATA%\NOS\token.dat
            try
            {
                var tokenPath = GetEncryptedTokenPath();
                var rawBytes = Encoding.UTF8.GetBytes(token);
                var encryptedBytes = ProtectedData.Protect(rawBytes, null, DataProtectionScope.CurrentUser);
                File.WriteAllBytes(tokenPath, encryptedBytes);
            }
            catch
            {
                // Fallback
            }
        }
    }
}