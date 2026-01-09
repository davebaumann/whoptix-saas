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
        public string? StripeCustomerId { get; set; } // Stripe customer ID for receipts/billing
        public MembershipLevel MembershipLevel { get; set; } = MembershipLevel.Basic;
        
        // Low Stock Notification Preferences
        public bool LowStockNotificationsEnabled { get; set; } = false;
        public string? LowStockNotificationEmail { get; set; }
        public int LowStockCheckIntervalMinutes { get; set; } = 240; // 4 hours default
        
        // Membership Status Tracking
        public bool IsActive { get; set; } = true;
        public DateTime? CancelledAt { get; set; }
        public DateTime? ScheduledForDeletion { get; set; }
        
        // Audit timestamps
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }
}
