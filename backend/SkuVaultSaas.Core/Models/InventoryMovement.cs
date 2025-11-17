namespace SkuVaultSaaS.Core.Models
{
    public class InventoryMovement
    {
        public long Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;

        public int? LocationId { get; set; }
        public Location? Location { get; set; }

        public int QuantityChange { get; set; } // positive for receipts, negative for picks
        public string? Reason { get; set; }
        public string? Reference { get; set; } // e.g., order number, PO number
        public string? PerformedBy { get; set; }
        public string? TransactionType { get; set; } // e.g., Pick, Receive, Adjust, Pack
        public string? Context { get; set; } // Sale ID or other context from SkuVault API

        public DateTime OccurredAtUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }
}
