using Microsoft.Extensions.Logging;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace SkuVaultSaaS.Api.Middleware
{
    /// <summary>
    /// Global exception handling middleware that catches all unhandled exceptions
    /// and logs them with full context for debugging and monitoring.
    /// </summary>
    public class GlobalExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

        public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
        {
            _next = next ?? throw new ArgumentNullException(nameof(next));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                // Log the exception with full context
                _logger.LogError(ex, 
                    "Unhandled exception occurred. Path: {Path}, Method: {Method}, RemoteIP: {RemoteIP}, UserId: {UserId}",
                    context.Request.Path,
                    context.Request.Method,
                    context.Connection.RemoteIpAddress?.ToString(),
                    context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "Anonymous");

                // Handle the exception response
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;

            var response = new
            {
                message = "An internal server error occurred. Please try again later.",
                requestId = context.TraceIdentifier,
                timestamp = DateTime.UtcNow,
                error = GetEnvironmentSpecificMessage(exception)
            };

            return context.Response.WriteAsJsonAsync(response);
        }

        /// <summary>
        /// Returns more detailed error info in development, generic message in production
        /// </summary>
        private static string GetEnvironmentSpecificMessage(Exception exception)
        {
            var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
            
            if (isDevelopment)
            {
                return $"{exception.GetType().Name}: {exception.Message}";
            }

            // In production, don't expose internal details
            return "An error occurred processing your request. Our team has been notified.";
        }
    }
}
