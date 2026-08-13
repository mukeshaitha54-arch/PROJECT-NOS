using System;
using System.Threading;
using System.Threading.Tasks;

namespace NOS.Agent.Services
{
    public class SafeModeService : ISafeModeService
    {
        private bool _isActive;
        private CancellationTokenSource? _cts;

        public bool IsActive => _isActive;

        public void ActivateSafeMode(int durationMinutes)
        {
            _isActive = true;
            _cts?.Cancel();
            _cts = new CancellationTokenSource();
            
            Task.Delay(TimeSpan.FromMinutes(durationMinutes), _cts.Token).ContinueWith(t =>
            {
                if (!t.IsCanceled)
                {
                    _isActive = false;
                }
            });
        }
    }
}
