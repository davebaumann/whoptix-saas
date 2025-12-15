namespace SkuVaultSaaS.Core.Models
{
    public class Shipment
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public string ShipmentId { get; set; } = null!;
        public string OrderId { get; set; } = null!;
        public string TrackingNumber { get; set; } = string.Empty;
        public string Carrier { get; set; } = string.Empty;
        public string Service { get; set; } = string.Empty;
        public DateTime ShippedDate { get; set; }
        public DateTime CreatedDateUtc { get; set; }
        public DateTime UpdatedDateUtc { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal ShippingCost { get; set; }
        public string RecipientName { get; set; } = string.Empty;
        public string RecipientAddress { get; set; } = string.Empty;
        public string RecipientCity { get; set; } = string.Empty;
        public string RecipientState { get; set; } = string.Empty;
        public string RecipientZip { get; set; } = string.Empty;
        public string RecipientCountry { get; set; } = string.Empty;
    }
}