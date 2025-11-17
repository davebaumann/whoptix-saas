namespace SkuVaultSaaS.Core.Models
{
    public class Product
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public string Sku { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Category { get; set; }
        public decimal? Cost { get; set; }
        public decimal? Price { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }

        public ICollection<InventoryLevel> InventoryLevels { get; set; } = new List<InventoryLevel>();
        public ICollection<InventoryMovement> Movements { get; set; } = new List<InventoryMovement>();
    }
}
