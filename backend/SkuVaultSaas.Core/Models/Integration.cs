using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkuVaultSaaS.Core.Models
{
    public class Integration
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant Tenant { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string SkuVaultId { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? SkuVaultLongId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Type { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[] RowVersion { get; set; } = new byte[0];
    }
}
