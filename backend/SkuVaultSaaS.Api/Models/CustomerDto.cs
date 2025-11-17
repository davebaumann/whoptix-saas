using System.ComponentModel.DataAnnotations;

namespace SkuVaultSaaS.Api.Models
{
    public class CustomerCreateDto
    {
        [Required]
        [StringLength(100)]
        public string ExternalId { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(200)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public int TenantId { get; set; }
    }

    public class CustomerUpdateDto
    {
        [Required]
        [StringLength(100)]
        public string ExternalId { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(200)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public int TenantId { get; set; }
    }
}
