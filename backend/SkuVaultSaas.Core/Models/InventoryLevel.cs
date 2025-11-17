namespace SkuVaultSaaS.Core.Models
{
    public class InventoryLevel
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;

        public int LocationId { get; set; }
        public Location Location { get; set; } = null!;

        public int QuantityOnHand { get; set; }
        public int QuantityAvailable { get; set; }
        public int QuantityAllocated { get; set; }

        public DateTime UpdatedAtUtc { get; set; }
    }
}
