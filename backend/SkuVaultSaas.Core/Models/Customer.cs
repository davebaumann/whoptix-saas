using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Core.Models
{
    public class Customer
    {
        public int Id { get; set; }
        public string ExternalId { get; set; } = null!; // e.g., from SkuVault
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public int TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;
        public DateTime LastSyncedAt { get; set; }
        public MembershipLevel MembershipLevel { get; set; } = MembershipLevel.Basic;
    }
}
