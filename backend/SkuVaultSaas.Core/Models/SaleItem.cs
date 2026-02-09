using System;

namespace SkuVaultSaaS.Core.Models
{
    public class SaleItem
    {
        public int Id { get; set; }
        public string SaleId { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string? Sku { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string? ItemType { get; set; }  // 'MerchantItem' or 'FulfilledItem'
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }

        // Navigation property for Customer FK only
        public virtual Customer? Customer { get; set; }
    }
}
