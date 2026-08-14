using System;
using System.ComponentModel.DataAnnotations;
using System.IO;

namespace NOS.Agent.Configuration
{
    public class AgentConfiguration
    {
        [Required]
        public string ServerUrl { get; set; } = "http://localhost:3001";

        [MaxLength(64)]
        public string DeviceId { get; set; } = string.Empty;

        [MaxLength(64)]
        public string TenantId { get; set; } = "default-org";

        public string ApiKey { get; set; } = string.Empty;

        [Range(10, 3600)]
        public int HeartbeatIntervalSeconds { get; set; } = 60;

        [Range(30, 86400)]
        public int TelemetryIntervalSeconds { get; set; } = 300;

        [Range(60, 86400)]
        public int InventoryIntervalSeconds { get; set; } = 3600;

        [Range(60, 86400)]
        public int SecurityScanIntervalSeconds { get; set; } = 900;

        [Range(1, 100)]
        public int MaxCpuPercent { get; set; } = 15;

        [Range(32, 2048)]
        public int MaxRamMb { get; set; } = 256;

        [Range(1, 10)]
        public int MaxConcurrentCollections { get; set; } = 2;

        public bool EnableOfflineQueue { get; set; } = true;
        public bool EnableSelfThrottling { get; set; } = true;
        public bool EnableWindowsEventLog { get; set; } = true;

        [Range(1, 30)]
        public int LogRetentionDays { get; set; } = 7;

        public string SqliteDbPath { get; set; } = string.Empty;

        public ResourceGuardrailsConfig ResourceGuardrails { get; set; } = new ResourceGuardrailsConfig();

        public class ResourceGuardrailsConfig
        {
            public double MaxCpuPercent { get; set; } = 3.0;
            public double MaxRamMB { get; set; } = 128;
            public double EmergencyRamMB { get; set; } = 200;
            public int ThrottleTelemetryIntervalSec { get; set; } = 600;
            public int ThrottleHeartbeatIntervalSec { get; set; } = 120;
        }

        public void Validate()
        {
            if (string.IsNullOrWhiteSpace(ServerUrl))
            {
                throw new ValidationException("ServerUrl is required.");
            }

            if (!ServerUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !ServerUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("ServerUrl must start with http:// or https://.");
            }

            if (HeartbeatIntervalSeconds >= TelemetryIntervalSeconds)
            {
                // Fallback rather than throwing in single-file production mode
                HeartbeatIntervalSeconds = Math.Min(60, TelemetryIntervalSeconds - 10);
            }
        }

        public void Normalize()
        {
            if (!string.IsNullOrEmpty(ServerUrl) && ServerUrl.EndsWith("/"))
            {
                ServerUrl = ServerUrl.TrimEnd('/');
            }

            if (!string.IsNullOrEmpty(DeviceId))
            {
                DeviceId = DeviceId.ToLowerInvariant().Trim();
            }

            if (!string.IsNullOrEmpty(TenantId))
            {
                TenantId = TenantId.ToLowerInvariant().Trim();
            }

            if (string.IsNullOrWhiteSpace(SqliteDbPath))
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var nosDir = Path.Combine(appData, "NOS");
                if (!Directory.Exists(nosDir))
                {
                    Directory.CreateDirectory(nosDir);
                }
                SqliteDbPath = Path.Combine(nosDir, "outbox.db");
            }
            else
            {
                var directory = Path.GetDirectoryName(SqliteDbPath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }
            }
        }
    }
}
