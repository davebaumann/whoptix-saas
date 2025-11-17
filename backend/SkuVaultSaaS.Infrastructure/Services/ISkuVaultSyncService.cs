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
        Task SyncInventoryMovementsAsync(int customerId, DateTime? since = null);

        /// <summary>
        /// Synchronizes transactions from SkuVault for a specific customer
        /// </summary>
        Task SyncTransactionsAsync(int customerId, DateTime? since = null);

        /// <summary>
        /// Synchronizes all customers for all tenants
        /// </summary>
        Task SyncAllCustomersAsync();
    }
}
