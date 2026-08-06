using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NOS.Agent.Models
{
    public class OutboxMessage
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(32)]
        public string MessageType { get; set; } = string.Empty;

        [Required]
        public string Payload { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int RetryCount { get; set; } = 0;

        public DateTime? NextRetryAt { get; set; }

        public DateTime? DeliveredAt { get; set; }

        [MaxLength(512)]
        public string? LastError { get; set; }

        public int Priority { get; set; }

        [MaxLength(64)]
        public string? DeviceId { get; set; }

        [MaxLength(64)]
        public string? TenantId { get; set; }

        public bool IsDeadLetter { get; set; } = false;
    }
}
