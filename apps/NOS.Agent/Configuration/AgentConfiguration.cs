using System;
using System.ComponentModel.DataAnnotations;
using System.IO;

namespace NOS.Agent.Configuration
{
    public class AgentConfiguration
    {
        [Required]
        public string ServerUrl { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        [MaxLength(64)]
        public string DeviceId { get; set; } = string.Empty;

        [Required]
        [MinLength(4)]
        [MaxLength(64)]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        [MinLength(32)]
        [MaxLength(256)]
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

        public string SqliteDbPath { get; set; } = @"C:\ProgramData\NOS\Agent\outbox.db";

        public void Validate()
        {
            var context = new ValidationContext(this, serviceProvider: null, items: null);
            Validator.ValidateObject(this, context, validateAllProperties: true);

            if (HeartbeatIntervalSeconds >= TelemetryIntervalSeconds)
            {
                throw new ValidationException("HeartbeatIntervalSeconds must be less than TelemetryIntervalSeconds.");
            }

            if (!ServerUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("ServerUrl must start with https://");
            }

            if (ApiKey == "YOUR_API_KEY_HERE" || ApiKey.Contains("placeholder", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("ApiKey cannot be placeholder text.");
            }
        }

        public void Normalize()
        {
            if (ServerUrl.EndsWith("/"))
            {
                ServerUrl = ServerUrl.TrimEnd('/');
            }

            DeviceId = DeviceId.ToLowerInvariant();
            TenantId = TenantId.ToLowerInvariant();

            var directory = Path.GetDirectoryName(SqliteDbPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }
        }
    }
}
