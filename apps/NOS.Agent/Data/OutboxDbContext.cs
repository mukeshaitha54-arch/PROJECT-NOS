using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NOS.Agent.Models;

namespace NOS.Agent.Data
{
    public class OutboxDbContext : DbContext
    {
        public string DbPath { get; }

        public DbSet<OutboxMessage> OutboxMessages { get; set; } = null!;

        private static readonly SemaphoreSlim _initLock = new SemaphoreSlim(1, 1);
        private static bool _initialized = false;

        public OutboxDbContext(string dbPath)
        {
            DbPath = dbPath;
        }

        protected override void OnConfiguring(DbContextOptionsBuilder options)
            => options.UseSqlite($"Data Source={DbPath}");

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
