using System.ComponentModel.DataAnnotations;

namespace SkuVaultSaaS.Api.Models
{
    public class TenantCreateDto
    {
        [Required]
        [StringLength(200, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [StringLength(200)]
        public string? SkuVaultAccountId { get; set; }
    }

    public class TenantUpdateDto
    {
        [Required]
        [StringLength(200, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [StringLength(200)]
        public string? SkuVaultAccountId { get; set; }
    }

    public class TenantCredentialsDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string Password { get; set; } = string.Empty;
    }

    public class TenantTokensDto
    {
        public string TenantToken { get; set; } = string.Empty;
        public string UserToken { get; set; } = string.Empty;
    }
}
