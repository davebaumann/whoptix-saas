using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;
using Microsoft.AspNetCore.Authorization;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // Temporarily removed [Authorize] for testing - TODO: Fix auth issue
    public class LowStockController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LowStockController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/lowstock/thresholds/{customerId}
        [HttpGet("thresholds/{customerId}")]
        public async Task<ActionResult<IEnumerable<LowStockThresholdDto>>> GetThresholds(int customerId)
        {
            var thresholds = await _context.LowStockThresholds
                .Include(lst => lst.Product)
                .Include(lst => lst.Location)
                .Where(lst => lst.CustomerId == customerId && lst.IsActive)
                .Select(lst => new LowStockThresholdDto
                {
                    Id = lst.Id,
                    ProductId = lst.ProductId,
                    ProductName = lst.Product.Name,
                    ProductSku = lst.Product.Sku,
                    LocationId = lst.LocationId,
                    LocationName = lst.Location != null ? lst.Location.Name : "All Locations",
                    ThresholdQuantity = lst.ThresholdQuantity,
                    IsActive = lst.IsActive,
                    UpdatedAtUtc = lst.UpdatedAtUtc,
                    UpdatedBy = lst.UpdatedBy
                })
                .OrderBy(lst => lst.ProductSku)
                .ThenBy(lst => lst.LocationName)
                .ToListAsync();

            return Ok(thresholds);
        }

        // GET: api/lowstock/products/{customerId}
        [HttpGet("products/{customerId}")]
        public async Task<ActionResult<IEnumerable<ProductSummaryDto>>> GetProducts(int customerId)
        {
            var products = await _context.Products
                .Where(p => p.CustomerId == customerId)
                .Select(p => new ProductSummaryDto
                {
                    id = p.Id,
                    sku = p.Sku,
                    name = p.Name,
                    category = p.Category
                })
                .OrderBy(p => p.sku)
                .ToListAsync();

            return Ok(products);
        }

        // GET: api/lowstock/locations/{customerId}
        [HttpGet("locations/{customerId}")]
        public async Task<ActionResult<IEnumerable<LocationSummaryDto>>> GetLocations(int customerId)
        {
            var locations = await _context.Locations
                .Where(l => l.CustomerId == customerId && l.IsActive)
                .Select(l => new LocationSummaryDto
                {
                    id = l.Id,
                    name = l.Name ?? l.Code,
                    code = l.Code
                })
                .OrderBy(l => l.code)
                .ToListAsync();

            return Ok(locations);
        }

        // POST: api/lowstock/thresholds
        [HttpPost("thresholds")]
        public async Task<ActionResult<LowStockThresholdDto>> CreateThreshold(CreateLowStockThresholdDto dto)
        {
            // Check if threshold already exists for this product/location combination
            var existing = await _context.LowStockThresholds
                .FirstOrDefaultAsync(lst => lst.CustomerId == dto.CustomerId 
                    && lst.ProductId == dto.ProductId 
                    && lst.LocationId == dto.LocationId);

            if (existing != null)
            {
                if (existing.IsActive)
                {
                    return BadRequest("A threshold already exists for this product and location combination.");
                }
                
                // Reactivate existing threshold with new values
                existing.ThresholdQuantity = dto.ThresholdQuantity;
                existing.IsActive = true;
                existing.UpdatedAtUtc = DateTime.UtcNow;
                existing.UpdatedBy = User.Identity?.Name ?? "System";
                
                await _context.SaveChangesAsync();
                
                var reactivatedDto = await GetThresholdDto(existing.Id);
                return CreatedAtAction(nameof(GetThresholds), new { customerId = dto.CustomerId }, reactivatedDto);
            }

            var threshold = new LowStockThreshold
            {
                CustomerId = dto.CustomerId,
                ProductId = dto.ProductId,
                LocationId = dto.LocationId,
                ThresholdQuantity = dto.ThresholdQuantity,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow,
                CreatedBy = User.Identity?.Name ?? "System",
                UpdatedBy = User.Identity?.Name ?? "System"
            };

            _context.LowStockThresholds.Add(threshold);
            await _context.SaveChangesAsync();

            var responseDto = await GetThresholdDto(threshold.Id);
            return CreatedAtAction(nameof(GetThresholds), new { customerId = dto.CustomerId }, responseDto);
        }

        // PUT: api/lowstock/thresholds/{id}
        [HttpPut("thresholds/{id}")]
        public async Task<IActionResult> UpdateThreshold(int id, UpdateLowStockThresholdDto dto)
        {
            var threshold = await _context.LowStockThresholds.FindAsync(id);
            if (threshold == null)
            {
                return NotFound();
            }

            threshold.ThresholdQuantity = dto.ThresholdQuantity;
            threshold.UpdatedAtUtc = DateTime.UtcNow;
            threshold.UpdatedBy = User.Identity?.Name ?? "System";

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/lowstock/thresholds/{id}
        [HttpDelete("thresholds/{id}")]
        public async Task<IActionResult> DeleteThreshold(int id)
        {
            var threshold = await _context.LowStockThresholds.FindAsync(id);
            if (threshold == null)
            {
                return NotFound();
            }

            // Soft delete by setting IsActive to false
            threshold.IsActive = false;
            threshold.UpdatedAtUtc = DateTime.UtcNow;
            threshold.UpdatedBy = User.Identity?.Name ?? "System";

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/lowstock/check/{customerId}
        [HttpGet("check/{customerId}")]
        public async Task<ActionResult<IEnumerable<LowStockItemDto>>> CheckLowStock(int customerId)
        {
            var lowStockItems = new List<LowStockItemDto>();

            // Get all inventory levels for the customer
            var inventoryLevels = await _context.InventoryLevels
                .Include(il => il.Product)
                .Include(il => il.Location)
                .Where(il => il.CustomerId == customerId)
                .ToListAsync();

            foreach (var inventoryLevel in inventoryLevels)
            {
                // Check for specific threshold for this product and location
                var specificThreshold = await _context.LowStockThresholds
                    .Where(lst => lst.CustomerId == customerId 
                        && lst.ProductId == inventoryLevel.ProductId 
                        && lst.LocationId == inventoryLevel.LocationId 
                        && lst.IsActive)
                    .FirstOrDefaultAsync();

                var thresholdQuantity = specificThreshold?.ThresholdQuantity ?? 10; // Default threshold
                
                if (inventoryLevel.QuantityAvailable <= thresholdQuantity)
                {
                    lowStockItems.Add(new LowStockItemDto
                    {
                        ProductId = inventoryLevel.ProductId,
                        ProductSku = inventoryLevel.Product.Sku,
                        ProductName = inventoryLevel.Product.Name,
                        LocationId = inventoryLevel.LocationId,
                        LocationName = inventoryLevel.Location.Name ?? inventoryLevel.Location.Code,
                        CurrentQuantity = inventoryLevel.QuantityAvailable,
                        ThresholdQuantity = thresholdQuantity,
                        IsCustomThreshold = specificThreshold != null
                    });
                }
            }

            return Ok(lowStockItems.OrderBy(x => x.ProductSku).ThenBy(x => x.LocationName));
        }

        private async Task<LowStockThresholdDto> GetThresholdDto(int id)
        {
            return await _context.LowStockThresholds
                .Include(lst => lst.Product)
                .Include(lst => lst.Location)
                .Where(lst => lst.Id == id)
                .Select(lst => new LowStockThresholdDto
                {
                    Id = lst.Id,
                    ProductId = lst.ProductId,
                    ProductName = lst.Product.Name,
                    ProductSku = lst.Product.Sku,
                    LocationId = lst.LocationId,
                    LocationName = lst.Location != null ? lst.Location.Name : "All Locations",
                    ThresholdQuantity = lst.ThresholdQuantity,
                    IsActive = lst.IsActive,
                    UpdatedAtUtc = lst.UpdatedAtUtc,
                    UpdatedBy = lst.UpdatedBy
                })
                .FirstAsync();
        }
    }

    // DTOs
    public class LowStockThresholdDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = null!;
        public string ProductSku { get; set; } = null!;
        public int? LocationId { get; set; }
        public string LocationName { get; set; } = null!;
        public int ThresholdQuantity { get; set; }
        public bool IsActive { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class CreateLowStockThresholdDto
    {
        public int CustomerId { get; set; }
        public int ProductId { get; set; }
        public int? LocationId { get; set; }
        public int ThresholdQuantity { get; set; }
    }

    public class UpdateLowStockThresholdDto
    {
        public int ThresholdQuantity { get; set; }
    }

    public class ProductSummaryDto
    {
        public int id { get; set; }
        public string sku { get; set; } = null!;
        public string name { get; set; } = null!;
        public string? category { get; set; }
    }

    public class LocationSummaryDto
    {
        public int id { get; set; }
        public string name { get; set; } = null!;
        public string code { get; set; } = null!;
    }

    public class LowStockItemDto
    {
        public int ProductId { get; set; }
        public string ProductSku { get; set; } = null!;
        public string ProductName { get; set; } = null!;
        public int LocationId { get; set; }
        public string LocationName { get; set; } = null!;
        public int CurrentQuantity { get; set; }
        public int ThresholdQuantity { get; set; }
        public bool IsCustomThreshold { get; set; }
    }
}