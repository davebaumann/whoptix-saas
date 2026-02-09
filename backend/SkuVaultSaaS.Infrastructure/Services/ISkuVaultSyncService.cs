using System.Threading.Tasks;

namespace SkuVaultSaaS.Infrastructure.Services
{
    public interface ISkuVaultSyncService
    {
        /// <summary>
        /// Synchronizes all data for a specific customer from SkuVault API
        /// </summary>
        Task SyncCustomerDataAsync(int customerId);

        /// <summary>
        /// Synchronizes products for a specific customer
        /// </summary>
        Task SyncProductsAsync(int customerId);

        /// <summary>
        /// Synchronizes locations for a specific customer
        /// </summary>
        Task SyncLocationsAsync(int customerId);

        /// <summary>
        /// Synchronizes inventory levels for a specific customer
        /// </summary>
        Task SyncInventoryLevelsAsync(int customerId);

        /// <summary>
        /// Synchronizes inventory movements for a specific customer
        /// </summary>
        // DECOMMISSIONED: Task SyncInventoryMovementsAsync(int customerId, DateTime? since = null);

        /// <summary>
        /// Synchronizes transactions from SkuVault for a specific customer
        /// </summary>
        Task SyncTransactionsAsync(int customerId, DateTime syncStartTime, DateTime syncFromDate);

        /// <summary>
        /// Synchronizes all customers for all tenants
        /// </summary>
        Task SyncAllCustomersAsync();

        /// <summary>
        /// Gets raw transaction data from SkuVault API for export/comparison (Admin use only)
        /// </summary>
        Task<List<dynamic>> GetApiTransactionsForExport(string tenantToken, string userToken, DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Synchronizes sales for a specific customer
        /// </summary>
        Task SyncSalesAsync(int customerId, DateTime syncStartTime, DateTime syncFromDate);

        /// <summary>
        /// Synchronizes shipments for a specific customer
        /// </summary>
        Task SyncShipmentsAsync(int customerId);

        /// <summary>
        /// Synchronizes active (non-completed) purchase orders for a specific customer
        /// </summary>
        Task SyncPurchaseOrdersAsync(int customerId, DateTime? syncFromDate = null);

        /// <summary>
        /// Synchronizes completed purchase orders for a specific customer (for historical/lead time analysis)
        /// </summary>
        Task SyncPurchaseOrdersCompletedAsync(int customerId, DateTime? syncFromDate = null);

        /// <summary>
        /// Synchronizes purchase order receives history for a specific customer (for item-level lead time analysis)
        /// </summary>
        Task SyncReceivesHistoryAsync(int customerId, DateTime? syncFromDate = null);

        /// <summary>
        /// Synchronizes integrations for a specific customer
        /// </summary>
        Task SyncIntegrationsAsync(int customerId);
    }
}
