using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkuVaultSaaS.Infrastructure.Services;
using System;
using System.Threading.Tasks;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/admin/sync")]
    public class AdminSyncController : ControllerBase
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AdminSyncController> _logger;

        public AdminSyncController(IServiceScopeFactory scopeFactory, ILogger<AdminSyncController> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        [HttpPost("trigger")]
        [Authorize(Roles = "Admin")]
        public IActionResult SyncData([FromBody] SyncDataRequest request)
        {
            Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
            Response.Headers["Pragma"] = "no-cache";
            Response.Headers["Expires"] = "0";
            
            if (request.CustomerId <= 0)
            {
                return BadRequest(new { error = "Invalid CustomerId" });
            }

            var syncStartTime = DateTime.UtcNow;
            var syncFromDate = request.FromDate ?? DateTime.UtcNow.AddDays(-30);

            // Start sync in background with proper DI scope
            _ = Task.Run(async () =>
            {
                using var scope = _scopeFactory.CreateScope();
                var syncService = scope.ServiceProvider.GetRequiredService<ISkuVaultSyncService>();
                
                try
                {
                    _logger.LogInformation("Admin manual sync started: Type={Type}, CustomerId={CustomerId}, FromDate={FromDate}", 
                        request.SyncType, request.CustomerId, request.FromDate);

                    switch (request.SyncType?.ToLower())
                    {
                        case "sales":
                            await syncService.SyncSalesAsync(request.CustomerId, syncStartTime, syncFromDate);
                            break;
                        case "transactions":
                            await syncService.SyncTransactionsAsync(request.CustomerId, syncStartTime, syncFromDate);
                            break;
                        case "products":
                            await syncService.SyncProductsAsync(request.CustomerId);
                            break;
                        case "locations":
                            await syncService.SyncLocationsAsync(request.CustomerId);
                            break;
                        case "inventory":
                            await syncService.SyncInventoryLevelsAsync(request.CustomerId);
                            break;
                        case "integrations":
                            await syncService.SyncIntegrationsAsync(request.CustomerId);
                            break;
                        case "shipments":
                            await syncService.SyncShipmentsAsync(request.CustomerId);
                            break;
                        case "pos":
                            await syncService.SyncPurchaseOrdersAsync(request.CustomerId, syncFromDate);
                            break;
                        case "pos-completed":
                            await syncService.SyncPurchaseOrdersCompletedAsync(request.CustomerId, syncFromDate);
                            break;
                        case "receives":
                            await syncService.SyncReceivesHistoryAsync(request.CustomerId, syncFromDate, request.ToDate);
                            break;
                        case "all":
                            await syncService.SyncCustomerDataAsync(request.CustomerId);
                            break;
                    }
                    _logger.LogInformation("Admin manual sync completed: Type={Type}, CustomerId={CustomerId}", 
                        request.SyncType, request.CustomerId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during manual sync: Type={Type}, CustomerId={CustomerId}", 
                        request.SyncType, request.CustomerId);
                }
            });

            return Ok(new { 
                message = $"{request.SyncType} sync started in background", 
                syncType = request.SyncType, 
                customerId = request.CustomerId,
                note = "Sync is running in background. Check logs for completion status."
            });
        }

        public class SyncDataRequest
        {
            public int CustomerId { get; set; }
            public string? SyncType { get; set; }
            public DateTime? FromDate { get; set; }
            public DateTime? ToDate { get; set; }
        }
    }
}
