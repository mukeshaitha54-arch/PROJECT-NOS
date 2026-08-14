using System;
using System.IO;
using System.Text.Json;
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

            // 1. Bind from configuration providers (appsettings.json, environment, cmdline)
            configuration.GetSection("AgentConfiguration").Bind(agentConfig);

            // 2. Direct property fallbacks from top-level command-line or environment
            var serverUrlArg = configuration["ServerUrl"] ?? configuration["server-url"];
            if (!string.IsNullOrWhiteSpace(serverUrlArg))
            {
                agentConfig.ServerUrl = serverUrlArg;
            }

            var deviceIdArg = configuration["DeviceId"] ?? configuration["device-id"];
            if (!string.IsNullOrWhiteSpace(deviceIdArg))
            {
                agentConfig.DeviceId = deviceIdArg;
            }

            var apiKeyArg = configuration["ApiKey"] ?? configuration["api-key"];
            if (!string.IsNullOrWhiteSpace(apiKeyArg))
            {
                agentConfig.ApiKey = apiKeyArg;
            }

            // 3. Load from persistent %LOCALAPPDATA%\NOS\device.json if present
            ApplyLocalDeviceIdentityOverrides(agentConfig);

            // 4. Override with Windows Registry values if available
            ApplyRegistryOverrides(agentConfig);

            // 5. Normalize values (directory creation, formatting)
            agentConfig.Normalize();

            // 6. Validate values
            agentConfig.Validate();

            return agentConfig;
        }

        private static void ApplyLocalDeviceIdentityOverrides(AgentConfiguration config)
        {
            try
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                var deviceJsonPath = Path.Combine(appData, "NOS", "device.json");
                if (File.Exists(deviceJsonPath))
                {
                    var json = File.ReadAllText(deviceJsonPath);
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    if (string.IsNullOrWhiteSpace(config.DeviceId) && root.TryGetProperty("DeviceId", out var devIdElem))
                    {
                        var devId = devIdElem.GetString();
                        if (!string.IsNullOrWhiteSpace(devId)) config.DeviceId = devId;
                    }

                    if (root.TryGetProperty("ServerUrl", out var srvUrlElem))
                    {
                        var srvUrl = srvUrlElem.GetString();
                        if (!string.IsNullOrWhiteSpace(srvUrl) && string.IsNullOrWhiteSpace(config.ServerUrl))
                        {
                            config.ServerUrl = srvUrl;
                        }
                    }

                    if (root.TryGetProperty("TenantId", out var tenantElem))
                    {
                        var tenant = tenantElem.GetString();
                        if (!string.IsNullOrWhiteSpace(tenant)) config.TenantId = tenant;
                    }
                }
            }
            catch
            {
                // Fallback gracefully if file is inaccessible
            }
        }

        private static void ApplyRegistryOverrides(AgentConfiguration config)
        {
            if (OperatingSystem.IsWindows())
            {
                try
                {
                    using var key = Registry.LocalMachine.OpenSubKey(RegistryKeyPath) ??
                                    Registry.CurrentUser.OpenSubKey(RegistryKeyPath);
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
                catch
                {
                    // Ignore registry access errors in non-elevated runs
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
