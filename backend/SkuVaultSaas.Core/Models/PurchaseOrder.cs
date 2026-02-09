namespace SkuVaultSaaS.Core.Models
{
    public class PurchaseOrder
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public string PoId { get; set; } = null!;
        public string PoNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public string SentStatus { get; set; } = string.Empty;
        public string SupplierName { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
        public DateTime OrderDate { get; set; }
        public DateTime OrderCancelDate { get; set; }
        public DateTime ArrivalDueDate { get; set; }
        public DateTime RequestedShipDate { get; set; }
        public DateTime ActualShippedDate { get; set; }
        public string TrackingInfo { get; set; } = string.Empty;
        public string PublicNotes { get; set; } = string.Empty;
        public string PrivateNotes { get; set; } = string.Empty;
        public string TermsName { get; set; } = string.Empty;
        public string ShipToWarehouse { get; set; } = string.Empty;
        public string ShipToAddress { get; set; } = string.Empty;
        public string CarrierName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public int LineItemCount { get; set; }
        public decimal TotalCost { get; set; }
        public DateTime CreatedDateUtc { get; set; }
        public DateTime UpdatedDateUtc { get; set; }
    }
}
