using System.Collections.Generic;
using System.Threading.Tasks;
using SkuVaultSaaS.Core.Models;

namespace SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi
{
    public interface ISkuVaultApiClient
    {
        Task<SkuVaultTokensDto> GetTokensAsync(string email, string password);
        Task<List<SkuVaultProductDto>> GetProductsAsync(string tenantToken, string userToken);
        Task<List<SkuVaultLocationDto>> GetLocationsAsync(string tenantToken, string userToken);
        Task<List<SkuVaultInventoryDto>> GetInventoryAsync(string tenantToken, string userToken);
        Task<List<SkuVaultInventoryMovementDto>> GetInventoryMovementsAsync(string tenantToken, string userToken, DateTime? fromDate = null, DateTime? toDate = null);
        Task<List<SkuVaultSaleDto>> GetSalesAsync(string tenantToken, string userToken, DateTime? fromDate = null, DateTime? toDate = null);
        Task<List<SkuVaultShipmentDto>> GetShipmentsAsync(string tenantToken, string userToken, DateTime? fromDate = null, DateTime? toDate = null);
    }

    public class SkuVaultTokensDto
    {
        public string TenantToken { get; set; } = string.Empty;
        public string UserToken { get; set; } = string.Empty;
    }

    public class SkuVaultCustomerDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        // Add more fields as needed from SkuVault's API
    }

    public class SkuVaultProductDto
    {
        public string Sku { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string LongDescription { get; set; } = string.Empty;
        public string Classification { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
        public decimal? RetailPrice { get; set; }
    }

    public class SkuVaultLocationDto
    {
        public string LocationCode { get; set; } = string.Empty;
        public string LocationName { get; set; } = string.Empty;
        public string WarehouseName { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true; // Default to true since SkuVault API doesn't include this field
    }

    public class SkuVaultInventoryDto
    {
        public string Sku { get; set; } = string.Empty;
        public string LocationCode { get; set; } = string.Empty;
        public int QuantityOnHand { get; set; }
        public int QuantityAvailable { get; set; }
        public int QuantityAllocated { get; set; }
    }

    public class SkuVaultInventoryMovementDto
    {
        public string Sku { get; set; } = string.Empty;
        public string? Code { get; set; }  // Product code from SkuVault
        public string? ScannedCode { get; set; }  // Barcode/scan identifier
        public string? Title { get; set; }  // Product title from SkuVault
        public string? Location { get; set; }  // SkuVault returns full location string like "WAREHOUSE--CODE"
        public int Quantity { get; set; }  // The quantity change (positive or negative)
        public int QuantityBefore { get; set; }
        public int QuantityAfter { get; set; }
        public string? TransactionReason { get; set; }
        public string? TransactionNote { get; set; }
        public string? User { get; set; }  // Email of user who performed the transaction
        public DateTime TransactionDate { get; set; }
        public string? TransactionType { get; set; }  // e.g., "Remove", "Add", "Transfer"
        public string? ContextType { get; set; }  // Type of context (e.g., "Sale")
        public string? ContextId { get; set; }  // ID from context (e.g., sale ID)
    }

    public class SkuVaultShipmentDto
    {
        public string ShipmentId { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string TrackingNumber { get; set; } = string.Empty;
        public string Carrier { get; set; } = string.Empty;
        public string Service { get; set; } = string.Empty;
        public DateTime ShippedDate { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime UpdatedDate { get; set; }
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

