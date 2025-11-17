namespace SkuVaultSaaS.Core.Models
{
    public class LowStockThreshold
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        
        public int? LocationId { get; set; }  // Null for global threshold, specific location ID for location-specific
        public Location? Location { get; set; }
        
        public int ThresholdQuantity { get; set; }
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public string CreatedBy { get; set; } = null!;  // User who set this threshold
        public string? UpdatedBy { get; set; }  // User who last updated this threshold
    }
}