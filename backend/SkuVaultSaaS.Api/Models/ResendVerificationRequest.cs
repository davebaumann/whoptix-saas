using System.ComponentModel.DataAnnotations;

namespace SkuVaultSaaS.Api.Models
{
    public class ResendVerificationRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}