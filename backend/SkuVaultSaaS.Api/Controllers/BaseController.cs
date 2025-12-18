using Microsoft.AspNetCore.Mvc;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    protected readonly ApplicationDbContext _context;
    protected readonly ICachingService _cache;
    protected readonly ILogger _logger;

    protected BaseController(
        ApplicationDbContext context, 
        ICachingService cache, 
        ILogger logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Get cached data or execute query if not cached
    /// </summary>
    protected async Task<T?> GetCachedAsync<T>(string cacheKey, Func<Task<T?>> queryFunc, TimeSpan? expiration = null) where T : class
    {
        // Try to get from cache first
        var cached = await _cache.GetAsync<T>(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        // Execute query if not in cache
        var result = await queryFunc();
        if (result != null)
        {
            await _cache.SetAsync(cacheKey, result, expiration ?? TimeSpan.FromMinutes(10));
        }

        return result;
    }

    /// <summary>
    /// Invalidate cache entries by pattern (e.g., when data is updated)
    /// </summary>
    protected async Task InvalidateCacheAsync(string pattern)
    {
        await _cache.RemoveByPatternAsync(pattern);
    }

    /// <summary>
    /// Generate cache key for customer-specific data
    /// </summary>
    protected string GetCustomerCacheKey(string customerId, string dataType, string? identifier = null)
    {
        return identifier != null 
            ? $"customer:{customerId}:{dataType}:{identifier}"
            : $"customer:{customerId}:{dataType}";
    }

    /// <summary>
    /// Generate cache key for user-specific data
    /// </summary>
    protected string GetUserCacheKey(string userId, string dataType, string? identifier = null)
    {
        return identifier != null 
            ? $"user:{userId}:{dataType}:{identifier}"
            : $"user:{userId}:{dataType}";
    }
}