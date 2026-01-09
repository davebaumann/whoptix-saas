using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using SkuVaultSaaS.Core.Models;

namespace SkuVaultSaaS.Api.Middleware
{
    /// <summary>
    /// Middleware that allows anonymous access to demo endpoints by creating a synthetic JWT claim
    /// when the 'demo' query parameter is present. This allows the demo pages to access the API
    /// without requiring actual authentication.
    /// </summary>
    public class DemoAuthMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<DemoAuthMiddleware> _logger;

        public DemoAuthMiddleware(RequestDelegate next, ILogger<DemoAuthMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            _logger.LogInformation("DemoAuthMiddleware: Processing request to {Path} with query string: {QueryString}", 
                context.Request.Path, context.Request.QueryString);

            // Check if this is a demo request:
            // 1. Path starts with /api/demo/ (dedicated demo endpoints)
            // 2. OR demo=true query parameter is present
            var isDemoPath = context.Request.Path.StartsWithSegments("/api/demo");
            var isDemoQuery = context.Request.Query.TryGetValue("demo", out var demoValue) 
                && demoValue == "true";
            var isDemoRequest = isDemoPath || isDemoQuery;

            _logger.LogInformation("DemoAuthMiddleware: isDemoRequest={IsDemoRequest}, isDemoPath={IsDemoPath}, isDemoQuery={isDemoQuery}, demoValue={DemoValue}", 
                isDemoRequest, isDemoPath, isDemoQuery, demoValue.ToString());

            if (isDemoRequest)
            {
                // Only apply demo auth to API routes (not static files, swagger, etc.)
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    // Create a synthetic user for demo access
                    var claims = new List<Claim>
                    {
                        new Claim(ClaimTypes.NameIdentifier, "demo-user"),
                        new Claim(ClaimTypes.Email, "demo@justsku.local"),
                        new Claim(ClaimTypes.Name, "Demo User"),
                        new Claim("IsDemo", "true"),
                        new Claim("CustomerId", "2"), // Use customer 2 for demo
                        new Claim(ClaimTypes.Role, "User")
                    };

                    var identity = new ClaimsIdentity(claims, "Demo");
                    var principal = new ClaimsPrincipal(identity);
                    context.User = principal;

                    _logger.LogInformation("DemoAuthMiddleware: Set demo user with CustomerId claim. Claims: {Claims}", 
                        string.Join(", ", claims.Select(c => $"{c.Type}={c.Value}")));
                }
            }

            await _next(context);
        }
    }
}
