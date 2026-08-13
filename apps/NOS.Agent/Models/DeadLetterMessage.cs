using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NOS.Agent.Models
{
    public class DeadLetterMessage
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(32)]
        public string MessageType { get; set; } = string.Empty;

        [Required]
        public string Payload { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
        
        public DateTime FailedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(512)]
        public string? FinalError { get; set; }

        public int Priority { get; set; }

        [MaxLength(64)]
        public string? DeviceId { get; set; }

        [MaxLength(64)]
        public string? TenantId { get; set; }
    }
}
