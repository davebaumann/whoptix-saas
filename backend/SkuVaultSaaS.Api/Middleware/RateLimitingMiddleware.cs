using Microsoft.AspNetCore.Http;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace SkuVaultSaaS.Api.Middleware
{
    /// <summary>
    /// Rate limiting middleware to prevent DOS attacks and brute force attempts
    /// Uses sliding window algorithm with client IP as key
    /// </summary>
    public class RateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly RateLimitOptions _options;
        private static readonly ConcurrentDictionary<string, RateLimitEntry> _requestCounts = new();

        public RateLimitingMiddleware(RequestDelegate next, RateLimitOptions options)
        {
            _next = next;
            _options = options;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var clientId = GetClientIdentifier(context);
            
            if (IsRateLimited(clientId))
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new 
                { 
                    error = "Rate limit exceeded. Please try again later.",
                    retryAfter = _options.WindowSeconds
                });
                return;
            }

            await _next(context);
        }

        private string GetClientIdentifier(HttpContext context)
        {
            // Try to get user ID if authenticated
            var userId = context.User?.FindFirst("sub")?.Value ?? context.User?.Identity?.Name;
            if (!string.IsNullOrEmpty(userId))
                return $"user:{userId}";

            // Fall back to IP address
            var ip = context.Connection.RemoteIpAddress?.ToString();
            return $"ip:{ip}";
        }

        private bool IsRateLimited(string clientId)
        {
            var now = DateTime.UtcNow;
            
            if (_requestCounts.TryGetValue(clientId, out var entry))
            {
                // Check if window has expired
                if ((now - entry.WindowStart).TotalSeconds > _options.WindowSeconds)
                {
                    // Window expired, reset
                    entry.Count = 1;
                    entry.WindowStart = now;
                    return false;
                }

                // Within window
                entry.Count++;
                return entry.Count > _options.MaxRequests;
            }

            // New client
            _requestCounts.TryAdd(clientId, new RateLimitEntry 
            { 
                Count = 1, 
                WindowStart = now 
            });

            return false;
        }

        private class RateLimitEntry
        {
            public int Count { get; set; }
            public DateTime WindowStart { get; set; }
        }
    }

    /// <summary>
    /// Rate limiting options
    /// </summary>
    public class RateLimitOptions
    {
        /// <summary>
        /// Time window in seconds
        /// </summary>
        public int WindowSeconds { get; set; } = 60;

        /// <summary>
        /// Maximum requests per window
        /// </summary>
        public int MaxRequests { get; set; } = 100;
    }
}
