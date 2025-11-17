using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.Services;
using System.Security.Claims;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SyncController : ControllerBase
    {
        private readonly ISkuVaultSyncService _syncService;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SyncController> _logger;

        public SyncController(
            ISkuVaultSyncService syncService,
            ApplicationDbContext context,
            ILogger<SyncController> logger)
        {
            _syncService = syncService;
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Manually trigger a full sync for a specific customer
        /// </summary>
        [HttpPost("customer/{customerId}")]
        public async Task<IActionResult> SyncCustomer(int customerId)
        {
            try
            {
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer == null)
                {
                    return NotFound(new { message = "Customer not found" });
                }

                _logger.LogInformation("Manual sync triggered for customer {CustomerId}", customerId);
                await _syncService.SyncCustomerDataAsync(customerId);

                return Ok(new { message = "Sync completed successfully", customerId });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Upstream SkuVault error syncing full customer {CustomerId}", customerId);
                return StatusCode(502, new { message = "SkuVault API error", error = httpEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing customer {CustomerId}", customerId);
                return StatusCode(500, new { message = "Error during sync", error = ex.Message });
            }
        }

        /// <summary>
        /// Manually trigger sync for all customers
        /// </summary>
        [HttpPost("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SyncAllCustomers()
        {
            try
            {
                _logger.LogInformation("Manual sync triggered for all customers");
                await _syncService.SyncAllCustomersAsync();

                return Ok(new { message = "Sync completed successfully for all customers" });
            }
                catch (HttpRequestException httpEx)
                {
                    _logger.LogError(httpEx, "Upstream SkuVault error syncing all customers");
                    return StatusCode(502, new { message = "SkuVault API error", error = httpEx.Message });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing all customers");
                    return StatusCode(500, new { message = "Error during sync", error = ex.Message });
                }
        }

        /// <summary>
        /// Sync only products for a customer
        /// </summary>
        [HttpPost("customer/{customerId}/products")]
        public async Task<IActionResult> SyncProducts(int customerId)
        {
            try
            {
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer == null)
                {
                    return NotFound(new { message = "Customer not found" });
                }

                await _syncService.SyncProductsAsync(customerId);
                return Ok(new { message = "Products synced successfully", customerId });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Upstream SkuVault error syncing products for customer {CustomerId}", customerId);
                return StatusCode(502, new { message = "SkuVault API error", error = httpEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing products for customer {CustomerId}", customerId);
                return StatusCode(500, new { message = "Error during sync", error = ex.Message });
            }
        }

        /// <summary>
        /// Sync only locations for a customer
        /// </summary>
        [HttpPost("customer/{customerId}/locations")]
        public async Task<IActionResult> SyncLocations(int customerId)
        {
            try
            {
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer == null)
                {
                    return NotFound(new { message = "Customer not found" });
                }

                await _syncService.SyncLocationsAsync(customerId);
                return Ok(new { message = "Locations synced successfully", customerId });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Upstream SkuVault error syncing locations for customer {CustomerId}", customerId);
                return StatusCode(502, new { message = "SkuVault API error", error = httpEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing locations for customer {CustomerId}", customerId);
                return StatusCode(500, new { message = "Error during sync", error = ex.Message });
            }
        }

        /// <summary>
        /// Sync only inventory levels for a customer
        /// </summary>
        [HttpPost("customer/{customerId}/inventory")]
        public async Task<IActionResult> SyncInventory(int customerId)
        {
            try
            {
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer == null)
                {
                    return NotFound(new { message = "Customer not found" });
                }

                await _syncService.SyncInventoryLevelsAsync(customerId);
                return Ok(new { message = "Inventory levels synced successfully", customerId });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Upstream SkuVault error syncing inventory for customer {CustomerId}", customerId);
                return StatusCode(502, new { message = "SkuVault API error", error = httpEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing inventory for customer {CustomerId}", customerId);
                return StatusCode(500, new { message = "Error during sync", error = ex.Message });
            }
        }

        /// <summary>
        /// Sync only inventory movements for a customer
        /// </summary>
        [HttpPost("customer/{customerId}/movements")]
        public async Task<IActionResult> SyncMovements(int customerId, [FromQuery] DateTime? since = null)
        {
            try
            {
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer == null)
                {
                    return NotFound(new { message = "Customer not found" });
                }

                await _syncService.SyncInventoryMovementsAsync(customerId, since);
                return Ok(new { message = "Inventory movements synced successfully", customerId });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Upstream SkuVault error syncing movements for customer {CustomerId}", customerId);
                return StatusCode(502, new { message = "SkuVault API error", error = httpEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing movements for customer {CustomerId}", customerId);
                return StatusCode(500, new { message = "Error during sync", error = ex.Message });
            }
        }

        /// <summary>
        /// Sync only transactions for a customer
        /// </summary>
        [HttpPost("customer/{customerId}/transactions")]
        public async Task<IActionResult> SyncTransactions(int customerId, [FromQuery] DateTime? since = null)
        {
            try
            {
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer == null)
                {
                    return NotFound(new { message = "Customer not found" });
                }

                _logger.LogInformation("Manual transaction sync triggered for customer {CustomerId}", customerId);
                await _syncService.SyncTransactionsAsync(customerId, since);

                return Ok(new { message = "Transactions synced successfully", customerId, since });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Upstream SkuVault error syncing transactions for customer {CustomerId}", customerId);
                return BadRequest(new { message = "SkuVault API error", details = httpEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing transactions for customer {CustomerId}", customerId);
                return StatusCode(500, new { message = "Internal server error", details = ex.Message });
            }
        }

        /// <summary>
        /// Get the last sync status for a customer
        /// </summary>
        [HttpGet("customer/{customerId}/status")]
        public async Task<IActionResult> GetSyncStatus(int customerId)
        {
            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null)
            {
                return NotFound(new { message = "Customer not found" });
            }

            var productCount = await _context.Products.CountAsync(p => p.CustomerId == customerId);
            var locationCount = await _context.Locations.CountAsync(l => l.CustomerId == customerId);
            var inventoryCount = await _context.InventoryLevels.CountAsync(i => i.CustomerId == customerId);
            var movementCount = await _context.InventoryMovements.CountAsync(m => m.CustomerId == customerId);
            var transactionCount = await _context.Transactions.CountAsync(t => t.CustomerId == customerId);

            return Ok(new
            {
                customer.Id,
                customer.Name,
                customer.LastSyncedAt,
                TenantConfigured = customer.Tenant != null && customer.Tenant.SkuVaultTenantToken != null,
                TenantTokenLength = customer.Tenant?.SkuVaultTenantToken?.Length ?? 0,
                UserTokenLength = customer.Tenant?.SkuVaultUserToken?.Length ?? 0,
                ProductCount = productCount,
                LocationCount = locationCount,
                InventoryCount = inventoryCount,
                MovementCount = movementCount,
                TransactionCount = transactionCount
            });
        }
    }
}
