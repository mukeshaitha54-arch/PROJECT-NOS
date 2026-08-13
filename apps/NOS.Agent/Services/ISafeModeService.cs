using System;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public interface ISafeModeService
    {
        bool IsActive { get; }
        void ActivateSafeMode(int durationMinutes);
    }
}
