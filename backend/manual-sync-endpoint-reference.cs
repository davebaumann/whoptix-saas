// ============================================================================
// NEW ENDPOINT: Manual Sync with Date Range Testing
// File: backend/SkuVaultSaaS.Api/Controllers/SyncController.cs
// ============================================================================

[HttpPost("manual-sync-transactions")]
[ProducesResponseType(typeof(ManualSyncResult), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
public async Task<IActionResult> ManualSyncTransactions(
    [FromQuery] int customerId,
    [FromQuery] DateTime? startDate = null,
    [FromQuery] DateTime? endDate = null)
{
    try
    {
        // Validate date range
        if (startDate.HasValue && endDate.HasValue && startDate > endDate)
        {
            return BadRequest(new { error = "startDate must be before endDate" });
        }

        // Default to last 30 days if not specified
        var from = startDate ?? DateTime.UtcNow.AddDays(-30);
        var to = endDate ?? DateTime.UtcNow;

        _logger.LogInformation("Manual sync initiated for customer {CustomerId}, date range {From} to {To}", 
            customerId, from, to);

        var customer = await _context.Customers
            .Include(c => c.Tenant)
            .FirstOrDefaultAsync(c => c.Id == customerId);

        if (customer == null)
            return NotFound(new { error = "Customer not found" });

        if (customer.Tenant == null || string.IsNullOrEmpty(customer.Tenant.SkuVaultTenantToken))
            return BadRequest(new { error = "SkuVault not configured for customer" });

        // Get count of existing transactions BEFORE sync
        int existingTransactionCount = await _context.Transactions
            .Where(t => t.CustomerId == customerId && t.TransactionDate >= from && t.TransactionDate <= to)
            .CountAsync();

        // Call the sync service with the specified date range
        await _syncService.SyncTransactionsAsync(customerId, DateTime.UtcNow, from);

        // Get count of transactions AFTER sync
        int newTransactionCount = await _context.Transactions
            .Where(t => t.CustomerId == customerId && t.TransactionDate >= from && t.TransactionDate <= to)
            .CountAsync();

        int transactionsAdded = newTransactionCount - existingTransactionCount;

        return Ok(new ManualSyncResult
        {
            CustomerId = customerId,
            SyncStartDate = from,
            SyncEndDate = to,
            TransactionsBeforeSync = existingTransactionCount,
            TransactionsAfterSync = newTransactionCount,
            TransactionsAdded = transactionsAdded,
            SyncedAt = DateTime.UtcNow,
            Status = "Success"
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Manual sync failed for customer {CustomerId}", customerId);
        return BadRequest(new { error = ex.Message });
    }
}

[HttpPost("validate-sync-gaps")]
[ProducesResponseType(typeof(SyncGapValidation), StatusCodes.Status200OK)]
public async Task<IActionResult> ValidateSyncGaps(
    [FromQuery] int customerId,
    [FromQuery] DateTime? startDate = null,
    [FromQuery] DateTime? endDate = null)
{
    try
    {
        var from = startDate ?? DateTime.UtcNow.AddDays(-30);
        var to = endDate ?? DateTime.UtcNow;

        // Query to find gaps in transaction data by SKU
        var result = await _context.Transactions
            .Where(t => t.CustomerId == customerId && t.TransactionDate >= from && t.TransactionDate <= to)
            .GroupBy(t => t.Sku)
            .Select(g => new
            {
                Sku = g.Key,
                TransactionCount = g.Count(),
                FirstTransaction = g.Min(t => t.TransactionDate),
                LastTransaction = g.Max(t => t.TransactionDate),
                DateRange = EF.Functions.DateDiffDay(g.Min(t => t.TransactionDate), g.Max(t => t.TransactionDate)),
                TransactionDensity = (double)g.Count() / (EF.Functions.DateDiffDay(g.Min(t => t.TransactionDate), g.Max(t => t.TransactionDate)) + 1)
            })
            .OrderBy(x => x.TransactionDensity)
            .ToListAsync();

        var gaps = result
            .Where(x => x.TransactionDensity < 0.5) // Less than 1 transaction every 2 days
            .Select(x => new
            {
                x.Sku,
                x.TransactionCount,
                x.FirstTransaction,
                x.LastTransaction,
                x.DateRange,
                Density = Math.Round(x.TransactionDensity, 3),
                Warning = "Low transaction density - possible gaps"
            })
            .ToList();

        return Ok(new SyncGapValidation
        {
            CustomerId = customerId,
            DateRangeStart = from,
            DateRangeEnd = to,
            TotalSkusWithTransactions = result.Count,
            SkusWithPotentialGaps = gaps.Count,
            PotentialGaps = gaps,
            TotalTransactions = result.Sum(x => x.TransactionCount)
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Gap validation failed for customer {CustomerId}", customerId);
        return BadRequest(new { error = ex.Message });
    }
}

// ============================================================================
// MODELS
// ============================================================================

public class ManualSyncResult
{
    public int CustomerId { get; set; }
    public DateTime SyncStartDate { get; set; }
    public DateTime SyncEndDate { get; set; }
    public int TransactionsBeforeSync { get; set; }
    public int TransactionsAfterSync { get; set; }
    public int TransactionsAdded { get; set; }
    public DateTime SyncedAt { get; set; }
    public string Status { get; set; }
}

public class SyncGapValidation
{
    public int CustomerId { get; set; }
    public DateTime DateRangeStart { get; set; }
    public DateTime DateRangeEnd { get; set; }
    public int TotalSkusWithTransactions { get; set; }
    public int SkusWithPotentialGaps { get; set; }
    public List<object> PotentialGaps { get; set; }
    public int TotalTransactions { get; set; }
}
