namespace SkuVaultSaaS.Core.Models
{
    public class Shipment
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public string ShipmentId { get; set; } = null!;
        public string SaleId { get; set; } = string.Empty;
        public string OrderId { get; set; } = null!;
        public string Source { get; set; } = string.Empty;
        public string TrackingNumber { get; set; } = string.Empty;
        public string Carrier { get; set; } = string.Empty;
        public string Service { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public DateTime ShippedDate { get; set; }
        public DateTime CreatedDateUtc { get; set; }
        public DateTime UpdatedDateUtc { get; set; }
        public DateTime EstimatedShipDate { get; set; }
        public DateTime EstimatedDeliveryDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string AlternateId { get; set; } = string.Empty;
        public string ManifestId { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public decimal TotalWeight { get; set; }
        public string WeightUnit { get; set; } = string.Empty;
        public string TrackingUrl { get; set; } = string.Empty;
        public decimal ShippingCost { get; set; }
        public string RecipientName { get; set; } = string.Empty;
        public string RecipientAddress { get; set; } = string.Empty;
        public string RecipientCity { get; set; } = string.Empty;
        public string RecipientState { get; set; } = string.Empty;
        public string RecipientZip { get; set; } = string.Empty;
        public string RecipientCountry { get; set; } = string.Empty;
    }
}