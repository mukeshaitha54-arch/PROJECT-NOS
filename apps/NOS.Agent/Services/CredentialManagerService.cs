using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public class CredentialManagerService : ICredentialManagerService
    {
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

        public Task<string?> GetDeviceTokenAsync()
        {
            if (CredRead("NOS_Agent_Token", CRED_TYPE_GENERIC, 0, out IntPtr credPtr))
            {
                try
                {
                    var cred = Marshal.PtrToStructure<CREDENTIAL>(credPtr);
                    if (cred.CredentialBlobSize > 0 && cred.CredentialBlob != IntPtr.Zero)
                    {
                        var bytes = new byte[cred.CredentialBlobSize];
                        Marshal.Copy(cred.CredentialBlob, bytes, 0, bytes.Length);
                        var token = Encoding.Unicode.GetString(bytes);
                        return Task.FromResult<string?>(token);
                    }
                }
                finally
                {
                    CredFree(credPtr);
                }
            }
            return Task.FromResult<string?>(null);
        }

        public Task SetDeviceTokenAsync(string token)
        {
            // Token is already written by DeviceRegistrationService
            return Task.CompletedTask;
        }
    }
}