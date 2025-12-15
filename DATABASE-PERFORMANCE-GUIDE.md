# Database Performance Optimization Guide

## Critical Performance Optimizations Implemented

### 1. Database Indexes
Run `AddPerformanceIndexes.sql` to create essential indexes:

**Most Critical Indexes:**
- `IX_InventoryMovements_CustomerId_OccurredAtUtc` - For time-based queries
- `IX_InventoryMovements_CustomerId_PerformedBy_OccurredAtUtc` - For packer performance
- `IX_InventoryMovements_CustomerId_TransactionType_OccurredAtUtc` - For transaction filtering

### 2. Query Optimizations

**Use Projections:**
```csharp
// BAD - Loads entire entity
var movements = await _context.InventoryMovements.ToListAsync();

// GOOD - Only loads needed columns
var movements = await _context.InventoryMovements
    .Select(t => new { t.OccurredAtUtc, t.QuantityChange, t.TransactionType })
    .ToListAsync();
```

**Use AsNoTracking():**
```csharp
// For read-only queries
.AsNoTracking()
```

**Database-Level Aggregation:**
```csharp
// BAD - Aggregates in memory
var summary = movements.GroupBy(x => x.Date).Select(g => new { ... });

// GOOD - Aggregates in database
var summary = await _context.InventoryMovements
    .GroupBy(t => t.OccurredAtUtc.Date)
    .Select(g => new { count = g.Count(), sum = g.Sum(x => x.Quantity) })
    .ToListAsync();
```

### 3. Pagination for Large Results
```csharp
// Always use Skip/Take for large datasets
.Skip(pageNumber * pageSize)
.Take(pageSize)
```

### 4. Optimized Controllers
- `OptimizedReportsController` - Uses efficient queries with database aggregation
- `PackerPerformanceController` - Updated with projections and AsNoTracking

### 5. Performance Monitoring

**Enable Query Logging (Development Only):**
```csharp
// In appsettings.Development.json
"Microsoft.EntityFrameworkCore.Database.Command": "Information"
```

**Key Metrics to Monitor:**
- Query execution time
- Number of database round trips
- Memory usage
- Index usage statistics

### 6. Best Practices for Large Tables

**InventoryMovements Table (Will grow rapidly):**
- Always filter by CustomerId first
- Use date range filters
- Consider partitioning by date for very large datasets
- Archive old data periodically

**Query Pattern:**
```csharp
// Always start with CustomerId filter
.Where(t => t.CustomerId == customerId && 
           t.OccurredAtUtc >= fromDate && 
           t.OccurredAtUtc <= toDate)
```

### 7. Caching Strategy
- Cache frequently accessed reference data (Products, Locations)
- Use Redis for session data and temporary calculations
- Implement query result caching for expensive reports

### 8. Database Maintenance
- Regular index maintenance
- Statistics updates
- Query plan analysis
- Periodic data archiving

## Performance Testing
Test with realistic data volumes:
- 1M+ inventory movements
- 10K+ products
- 100+ concurrent users

Monitor query performance and adjust indexes as needed.