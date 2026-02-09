namespace SkuVaultSaaS.Core.Models
{
    public class PurchaseOrderReceive
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public string PONumber { get; set; } = string.Empty;
        public string PartNumber { get; set; } = string.Empty;
        public string SKU { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int Quantity3PL { get; set; }
        public int QuantityToLocation { get; set; }
        public DateTime ReceiptDate { get; set; }
        public DateTime ReceivedDate { get; set; }
        public string Location { get; set; } = string.Empty;
        public string Warehouse { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public DateTime CreatedDateUtc { get; set; }
        public DateTime UpdatedDateUtc { get; set; }
    }
}
