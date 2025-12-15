using Microsoft.AspNetCore.Identity;

namespace SkuVaultSaaS.Core.Models
{
    public class ApplicationUser : IdentityUser
    {
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }
    }
}