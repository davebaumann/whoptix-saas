using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MigrationController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MigrationController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("create-lowstock-table")]
    public async Task<IActionResult> CreateLowStockTable()
    {
        try
        {
            // Create the table manually without foreign keys to avoid permission issues
            var sql = @"
                CREATE TABLE IF NOT EXISTS `LowStockThresholds` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `CustomerId` int NOT NULL,
                    `ProductId` int NOT NULL,
                    `LocationId` int NULL,
                    `ThresholdQuantity` int NOT NULL,
                    `IsActive` tinyint(1) NOT NULL,
                    `CreatedAtUtc` datetime(6) NOT NULL,
                    `UpdatedAtUtc` datetime(6) NOT NULL,
                    `CreatedBy` longtext CHARACTER SET utf8mb4 NOT NULL,
                    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
                    PRIMARY KEY (`Id`)
                ) CHARACTER SET=utf8mb4;

                CREATE INDEX IF NOT EXISTS `IX_LowStockThresholds_CustomerId_ProductId_LocationId` ON `LowStockThresholds` (`CustomerId`, `ProductId`, `LocationId`);
                CREATE INDEX IF NOT EXISTS `IX_LowStockThresholds_LocationId` ON `LowStockThresholds` (`LocationId`);
                CREATE INDEX IF NOT EXISTS `IX_LowStockThresholds_ProductId` ON `LowStockThresholds` (`ProductId`);

                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`) 
                VALUES ('20251113221347_AddLowStockThreshold', '8.0.11');
            ";

            await _context.Database.ExecuteSqlRawAsync(sql);

            return Ok(new { message = "LowStockThresholds table created successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error creating table", error = ex.Message });
        }
    }

    [HttpPost("fix-location-isactive")]
    public async Task<IActionResult> FixLocationIsActive()
    {
        try
        {
            var updatedCount = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE Locations SET IsActive = 1 WHERE IsActive = 0");

            return Ok(new { message = $"Updated {updatedCount} locations to IsActive = true" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error updating locations", error = ex.Message });
        }
    }
}