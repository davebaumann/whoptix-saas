using Microsoft.AspNetCore.Identity;
using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Core.Models
{
    public class ApplicationUser : IdentityUser
    {
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public CustomerRole CustomerRole { get; set; } = CustomerRole.Viewer;
    }
}