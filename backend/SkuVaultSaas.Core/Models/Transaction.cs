namespace SkuVaultSaaS.Core.Models
{
    public class Transaction
    {
        public long Id { get; set; }
        public int CustomerId { get; set; }

        // SkuVault-specific identifier (combination of SKU + date + user + context for uniqueness)
        public string SkuVaultId { get; set; } = string.Empty;
        
        public int ProductId { get; set; }
        public int? LocationId { get; set; }

        // Transaction details
        public string Sku { get; set; } = string.Empty;
        public int Quantity { get; set; } // The quantity change (positive or negative)
        public int QuantityBefore { get; set; } // Quantity before transaction
        public int QuantityAfter { get; set; } // Quantity after transaction
        
        // Transaction metadata
        public string? TransactionType { get; set; } // e.g., "Remove", "Add", "Transfer", "Pick", "Pack"
        public string? TransactionReason { get; set; } // Why the transaction occurred
        public string? TransactionNote { get; set; } // Additional notes
        public string? Context { get; set; } // Sale ID or other context from SkuVault API
        
        // User information
        public string? User { get; set; } // Email of user who performed the transaction
        public string? PerformedBy { get; set; } // Normalized user name
        
        // Timestamps
        public DateTime TransactionDate { get; set; } // When transaction occurred in SkuVault
        public DateTime SyncedAtUtc { get; set; } // When we synced from SkuVault
        public DateTime CreatedAtUtc { get; set; } // When record was created locally
    }
}