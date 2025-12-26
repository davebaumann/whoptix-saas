using Microsoft.AspNetCore.Identity;
using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Core.Models
{
    public class ApplicationUser : IdentityUser
    {
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public CustomerRole? CustomerRole { get; set; }
        
        // Two-Factor Authentication
        public new bool TwoFactorEnabled { get; set; } = false;
        public string? TwoFactorSecret { get; set; }
        public bool TwoFactorVerified { get; set; } = false;
        public List<string>? BackupCodes { get; set; }
        public DateTime? LastTwoFactorVerified { get; set; }
    }
}