using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NOS.Agent.Models;

namespace NOS.Agent.Data
{
    public class OutboxDbContext : DbContext
    {
        public DbSet<OutboxMessage> OutboxMessages { get; set; } = null!;
        public DbSet<DeadLetterMessage> DeadLetterMessages { get; set; } = null!;
        public DbSet<CrashLog> CrashLogs { get; set; } = null!;

        private static readonly SemaphoreSlim _initLock = new(1, 1);
        private static bool _initialized = false;

        public OutboxDbContext(DbContextOptions<OutboxDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<OutboxMessage>()
                .HasIndex(m => new { m.DeviceId, m.DeliveredAt });

            modelBuilder.Entity<OutboxMessage>()
                .HasIndex(m => new { m.NextRetryAt, m.IsDeadLetter });

            modelBuilder.Entity<OutboxMessage>()
                .HasIndex(m => m.Priority);

            modelBuilder.Entity<OutboxMessage>()
                .HasIndex(m => m.CreatedAt);
        }

        public async Task InitializeAsync(CancellationToken cancellationToken = default)
        {
            if (_initialized) return;

            await _initLock.WaitAsync(cancellationToken);
            try
            {
                if (_initialized) return;

                await Database.EnsureCreatedAsync(cancellationToken);
                
                var connection = Database.GetDbConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                {
                    await connection.OpenAsync(cancellationToken);
                }

                // Safely migrate OutboxMessages
                using (var command = connection.CreateCommand())
                {
                    var commands = new[]
                    {
                        "ALTER TABLE OutboxMessages ADD COLUMN RetryCount INTEGER NOT NULL DEFAULT 0;",
                        "ALTER TABLE OutboxMessages ADD COLUMN LastError TEXT;",
                        "ALTER TABLE OutboxMessages ADD COLUMN NextRetryAt TEXT;",
                        "ALTER TABLE OutboxMessages ADD COLUMN Priority INTEGER NOT NULL DEFAULT 5;",
                        @"CREATE TABLE IF NOT EXISTS DeadLetterMessages (
                            Id TEXT PRIMARY KEY,
                            DeviceId TEXT NOT NULL,
                            Type TEXT NOT NULL,
                            Payload TEXT NOT NULL,
                            CreatedAt TEXT NOT NULL,
                            FailedAt TEXT NOT NULL,
                            FinalError TEXT
                        );",
                        @"CREATE TABLE IF NOT EXISTS CrashLogs (
                            Id INTEGER PRIMARY KEY AUTOINCREMENT,
                            Timestamp TEXT NOT NULL,
                            ExceptionType TEXT,
                            Message TEXT,
                            StackTrace TEXT
                        );"
                    };

                    foreach (var ddl in commands)
                    {
                        command.CommandText = ddl;
                        try
                        {
                            await command.ExecuteNonQueryAsync(cancellationToken);
                        }
                        catch (Microsoft.Data.Sqlite.SqliteException ex) when (ex.SqliteErrorCode == 1 && ex.Message.Contains("duplicate column name"))
                        {
                            // Column already exists, ignore
                        }
                    }
                }
                
                using (var command = connection.CreateCommand())
                {
                    command.CommandText = "PRAGMA journal_mode = WAL;";
                    await command.ExecuteNonQueryAsync(cancellationToken);
                    
                    command.CommandText = "PRAGMA synchronous = NORMAL;";
                    await command.ExecuteNonQueryAsync(cancellationToken);
                }

                _initialized = true;
            }
            finally
            {
                _initLock.Release();
            }
        }
    }
}