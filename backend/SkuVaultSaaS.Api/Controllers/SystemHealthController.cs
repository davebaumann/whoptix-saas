using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class SystemHealthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SystemHealthController> _logger;

        public SystemHealthController(ApplicationDbContext context, ILogger<SystemHealthController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetSystemHealth()
        {
            try
            {
                var healthData = new
                {
                    timestamp = DateTime.UtcNow,
                    status = "healthy",
                    database = await CheckDatabaseHealth(),
                    api = CheckApiHealth(),
                    memory = GetMemoryUsage(),
                    uptime = GetUptime()
                };

                return Ok(healthData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking system health");
                return StatusCode(500, new { status = "unhealthy", error = ex.Message });
            }
        }

        private async Task<object> CheckDatabaseHealth()
        {
            try
            {
                var startTime = DateTime.UtcNow;
                var canConnect = await _context.Database.CanConnectAsync();
                var responseTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

                var customerCount = await _context.Customers.CountAsync();
                var productCount = await _context.Products.CountAsync();

                return new
                {
                    status = canConnect ? "connected" : "disconnected",
                    responseTimeMs = Math.Round(responseTime, 2),
                    customerCount,
                    productCount
                };
            }
            catch (Exception ex)
            {
                return new { status = "error", error = ex.Message };
            }
        }

        private object CheckApiHealth()
        {
            return new
            {
                status = "running",
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown",
                version = "1.0.0"
            };
        }

        private object GetMemoryUsage()
        {
            var process = System.Diagnostics.Process.GetCurrentProcess();
            return new
            {
                workingSetMB = Math.Round(process.WorkingSet64 / 1024.0 / 1024.0, 2),
                privateMemoryMB = Math.Round(process.PrivateMemorySize64 / 1024.0 / 1024.0, 2)
            };
        }

        private object GetUptime()
        {
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var uptime = DateTime.Now - process.StartTime;
            return new
            {
                totalMinutes = Math.Round(uptime.TotalMinutes, 2),
                startTime = process.StartTime.ToString("yyyy-MM-dd HH:mm:ss")
            };
        }
    }
}