using System;
using System.Collections.Generic;

namespace SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi
{
    public class SkuVaultSaleDto
    {
        public string Id { get; set; } = string.Empty;
        public string SellerSaleId { get; set; } = string.Empty;
        public string MarketplaceId { get; set; } = string.Empty;
        public string ChannelId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime SaleDate { get; set; }
        public string Marketplace { get; set; } = string.Empty;
        public List<SkuVaultSaleItemDto> SaleItems { get; set; } = new();
        public List<SkuVaultSaleItemDto> FulfilledItems { get; set; } = new();
        public List<object> SaleKits { get; set; } = new();
        public List<object> FulfilledKits { get; set; } = new();
        public SkuVaultMoneyDto ShippingCost { get; set; } = new();
        public SkuVaultMoneyDto ShippingCharge { get; set; } = new();
        public SkuVaultShippingInfoDto ShippingInfo { get; set; } = new();
        // Add other properties as needed from the JSON
    }

    public class SkuVaultSaleItemDto
    {
        public string Sku { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public SkuVaultMoneyDto UnitPrice { get; set; } = new();
        public object Promotions { get; set; } = new();
        public decimal Taxes { get; set; }
    }

    public class SkuVaultMoneyDto
    {
        public decimal a { get; set; }
        public string s { get; set; } = string.Empty;   // Symbol
    }

    public class SkuVaultShippingInfoDto
    {
        public string City { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        // Add other properties as needed
    }
}
