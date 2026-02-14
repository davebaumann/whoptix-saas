namespace SkuVaultSaaS.Core.Models
{
    public class PurchaseOrderLineItem
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public int PurchaseOrderId { get; set; }
        public PurchaseOrder PurchaseOrder { get; set; } = null!;

        // Line item details from SkuVault
        public string PoNumber { get; set; } = string.Empty;
        public string ProductId { get; set; } = string.Empty;
        public string SKU { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int QuantityTo3PL { get; set; }
        public int ReceivedQuantity { get; set; }
        public int ReceivedQuantityTo3PL { get; set; }
        public DateTime ReceivedDate { get; set; }
        public decimal Cost { get; set; }
        public decimal RetailCost { get; set; }
        public string? PrivateNotes { get; set; }
        public string? PublicNotes { get; set; }
        public string? Variant { get; set; }
        public string? Identifier { get; set; }

        public DateTime CreatedDateUtc { get; set; }
        public DateTime UpdatedDateUtc { get; set; }
    }
}
