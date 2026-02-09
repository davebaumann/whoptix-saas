namespace SkuVaultSaaS.Core.Models
{
    public class PurchaseOrderReceiveCorrection
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public string PONumber { get; set; } = string.Empty;
        public string PartNumber { get; set; } = string.Empty;
        public string SKU { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public int OldQuantity { get; set; }
        public int NewQuantity { get; set; }
        public int OldQuantity3PL { get; set; }
        public int NewQuantity3PL { get; set; }
        public DateTime CorrectedDate { get; set; }
        public DateTime ReceivedDate { get; set; }
        public string Username { get; set; } = string.Empty;
        public DateTime CreatedDateUtc { get; set; }
        public DateTime UpdatedDateUtc { get; set; }
    }
}
