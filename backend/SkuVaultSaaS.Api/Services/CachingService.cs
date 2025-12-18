using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace SkuVaultSaaS.Api.Services;

public interface ICachingService
{
    Task<T?> GetAsync<T>(string key) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class;
    Task RemoveAsync(string key);
    Task RemoveByPatternAsync(string pattern);
}

public class CachingService : ICachingService
{
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<CachingService> _logger;
    private readonly HashSet<string> _cacheKeys = new();
    private readonly object _lockObject = new();

    public CachingService(IMemoryCache memoryCache, ILogger<CachingService> logger)
    {
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public Task<T?> GetAsync<T>(string key) where T : class
    {
        try
        {
            if (_memoryCache.TryGetValue(key, out var cachedValue))
            {
                _logger.LogDebug("Cache hit for key: {Key}", key);
                return Task.FromResult(cachedValue as T);
            }

            _logger.LogDebug("Cache miss for key: {Key}", key);
            return Task.FromResult<T?>(null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving from cache for key: {Key}", key);
            return Task.FromResult<T?>(null);
        }
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
    {
        try
        {
            var options = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(15),
                SlidingExpiration = TimeSpan.FromMinutes(5),
                Size = 1,
                Priority = CacheItemPriority.Normal
            };

            options.RegisterPostEvictionCallback((key, value, reason, state) =>
            {
                lock (_lockObject)
                {
                    _cacheKeys.Remove(key.ToString()!);
                }
                _logger.LogDebug("Cache entry evicted: {Key}, Reason: {Reason}", key, reason);
            });

            _memoryCache.Set(key, value, options);

            lock (_lockObject)
            {
                _cacheKeys.Add(key);
            }

            _logger.LogDebug("Cache set for key: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting cache for key: {Key}", key);
        }

        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key)
    {
        try
        {
            _memoryCache.Remove(key);
            lock (_lockObject)
            {
                _cacheKeys.Remove(key);
            }
            _logger.LogDebug("Cache removed for key: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache for key: {Key}", key);
        }

        return Task.CompletedTask;
    }

    public Task RemoveByPatternAsync(string pattern)
    {
        try
        {
            List<string> keysToRemove;
            lock (_lockObject)
            {
                keysToRemove = _cacheKeys.Where(k => k.Contains(pattern)).ToList();
            }

            foreach (var key in keysToRemove)
            {
                _memoryCache.Remove(key);
                lock (_lockObject)
                {
                    _cacheKeys.Remove(key);
                }
            }

            _logger.LogDebug("Cache cleared for pattern: {Pattern}, Keys removed: {Count}", pattern, keysToRemove.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache by pattern: {Pattern}", pattern);
        }

        return Task.CompletedTask;
    }
}