using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NOS.Agent.Models
{
    public class CrashLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(256)]
        public string ExceptionType { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        public string StackTrace { get; set; } = string.Empty;
    }
}
