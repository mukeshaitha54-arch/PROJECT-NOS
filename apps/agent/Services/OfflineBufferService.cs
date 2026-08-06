using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace NOS.Agent.Services
{
    public class OfflineBufferService : IOfflineBufferService
    {
        private readonly ILogger<OfflineBufferService> _logger;
        private readonly ConcurrentQueue<string> _buffer = new ConcurrentQueue<string>();
        private readonly string _bufferFilePath;
        private const int MaxBufferSize = 1000;

        public OfflineBufferService(ILogger<OfflineBufferService> logger)
        {
            _logger = logger;
            var programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
            var nosDirectory = Path.Combine(string.IsNullOrEmpty(programData) ? AppContext.BaseDirectory : programData, "NOS", "Agent");
            
            try
            {
                if (!Directory.Exists(nosDirectory))
                {
                    Directory.CreateDirectory(nosDirectory);
                }
                _bufferFilePath = Path.Combine(nosDirectory, "telemetry_buffer.json");
            }
            catch
            {
                _bufferFilePath = Path.Combine(AppContext.BaseDirectory, "telemetry_buffer.json");
            }

            _ = LoadAsync();
        }

        public int Count => _buffer.Count;

        public async Task EnqueueAsync<T>(T payload)
        {
            try
            {
                if (_buffer.Count >= MaxBufferSize)
                {
                    _buffer.TryDequeue(out _); // Ring buffer eviction when full
                }

                var json = JsonSerializer.Serialize(payload);
                _buffer.Enqueue(json);
                await PersistAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[OfflineBuffer] Error enqueuing telemetry item.");
            }
        }

        public async Task<List<T>> DequeueBatchAsync<T>(int batchSize)
        {
            var result = new List<T>();
            for (int i = 0; i < batchSize; i++)
            {
                if (_buffer.TryDequeue(out var json))
                {
                    try
                    {
                        var item = JsonSerializer.Deserialize<T>(json);
                        if (item != null) result.Add(item);
                    }
                    catch
                    {
                        // Ignore corrupt item
                    }
                }
                else
                {
                    break;
                }
            }

            if (result.Count > 0)
            {
                await PersistAsync();
            }

            return result;
        }

        public async Task PersistAsync()
        {
            try
            {
                var items = _buffer.ToArray();
                var json = JsonSerializer.Serialize(items);
                await File.WriteAllTextAsync(_bufferFilePath, json);
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"[OfflineBuffer] Save warning: {ex.Message}");
            }
        }

        public async Task LoadAsync()
        {
            try
            {
                if (File.Exists(_bufferFilePath))
                {
                    var json = await File.ReadAllTextAsync(_bufferFilePath);
                    var items = JsonSerializer.Deserialize<string[]>(json);
                    if (items != null)
                    {
                        foreach (var item in items)
                        {
                            _buffer.Enqueue(item);
                        }
                        _logger.LogInformation($"[OfflineBuffer] Restored {_buffer.Count} buffered telemetry items from disk.");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"[OfflineBuffer] Load warning: {ex.Message}");
            }
        }
    }
}
