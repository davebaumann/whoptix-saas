namespace SkuVaultSaaS.Core.Models
{
    public class Location
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public string Code { get; set; } = null!; // e.g., Warehouse-Bin
        public string? Name { get; set; }
        public string? Warehouse { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }

        public ICollection<InventoryLevel> InventoryLevels { get; set; } = new List<InventoryLevel>();
    }
}
