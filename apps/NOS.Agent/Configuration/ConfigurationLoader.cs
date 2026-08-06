using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Win32;

namespace NOS.Agent.Configuration
{
    public static class ConfigurationLoader
    {
        private const string RegistryKeyPath = @"SOFTWARE\NOS\Agent";

        public static AgentConfiguration Load(IConfiguration configuration)
        {
            var agentConfig = new AgentConfiguration();
            
            // Load from appsettings.json
            configuration.GetSection("AgentConfiguration").Bind(agentConfig);

            // Override with Registry values
            ApplyRegistryOverrides(agentConfig);

            // Normalize values
            agentConfig.Normalize();

            // Validate values
            agentConfig.Validate();

            return agentConfig;
        }

        private static void ApplyRegistryOverrides(AgentConfiguration config)
        {
            if (OperatingSystem.IsWindows())
            {
                using var key = Registry.LocalMachine.OpenSubKey(RegistryKeyPath);
                if (key != null)
                {
                    config.ServerUrl = GetRegistryValue(key, nameof(config.ServerUrl), config.ServerUrl);
                    config.DeviceId = GetRegistryValue(key, nameof(config.DeviceId), config.DeviceId);
                    config.TenantId = GetRegistryValue(key, nameof(config.TenantId), config.TenantId);
                    config.ApiKey = GetRegistryValue(key, nameof(config.ApiKey), config.ApiKey);
                    
                    config.HeartbeatIntervalSeconds = GetRegistryValue(key, nameof(config.HeartbeatIntervalSeconds), config.HeartbeatIntervalSeconds);
                    config.TelemetryIntervalSeconds = GetRegistryValue(key, nameof(config.TelemetryIntervalSeconds), config.TelemetryIntervalSeconds);
                    config.InventoryIntervalSeconds = GetRegistryValue(key, nameof(config.InventoryIntervalSeconds), config.InventoryIntervalSeconds);
                    config.SecurityScanIntervalSeconds = GetRegistryValue(key, nameof(config.SecurityScanIntervalSeconds), config.SecurityScanIntervalSeconds);
                    
                    config.MaxCpuPercent = GetRegistryValue(key, nameof(config.MaxCpuPercent), config.MaxCpuPercent);
                    config.MaxRamMb = GetRegistryValue(key, nameof(config.MaxRamMb), config.MaxRamMb);
                    config.MaxConcurrentCollections = GetRegistryValue(key, nameof(config.MaxConcurrentCollections), config.MaxConcurrentCollections);
                    
                    config.EnableOfflineQueue = GetRegistryValue(key, nameof(config.EnableOfflineQueue), config.EnableOfflineQueue);
                    config.EnableSelfThrottling = GetRegistryValue(key, nameof(config.EnableSelfThrottling), config.EnableSelfThrottling);
                    config.EnableWindowsEventLog = GetRegistryValue(key, nameof(config.EnableWindowsEventLog), config.EnableWindowsEventLog);
                    
                    config.LogRetentionDays = GetRegistryValue(key, nameof(config.LogRetentionDays), config.LogRetentionDays);
                    config.SqliteDbPath = GetRegistryValue(key, nameof(config.SqliteDbPath), config.SqliteDbPath);
                }
            }
        }

        private static string GetRegistryValue(RegistryKey key, string name, string defaultValue)
        {
            var value = key.GetValue(name);
            return value?.ToString() ?? defaultValue;
        }

        private static int GetRegistryValue(RegistryKey key, string name, int defaultValue)
        {
            var value = key.GetValue(name);
            if (value != null && int.TryParse(value.ToString(), out int result))
            {
                return result;
            }
            return defaultValue;
        }

        private static bool GetRegistryValue(RegistryKey key, string name, bool defaultValue)
        {
            var value = key.GetValue(name);
            if (value != null && bool.TryParse(value.ToString(), out bool result))
            {
                return result;
            }
            if (value != null && int.TryParse(value.ToString(), out int intResult))
            {
                return intResult != 0;
            }
            return defaultValue;
        }
    }
}
