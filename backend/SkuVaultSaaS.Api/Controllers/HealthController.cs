using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/health")]
    [AllowAnonymous]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;

        public HealthController(ILogger<HealthController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Simple health check endpoint for load balancers and health probes
        /// Bypasses hostname validation since it's called from localhost/internal sources
        /// </summary>
        [HttpGet]
        public IActionResult Get()
        {
            _logger.LogInformation("Health check requested");
            return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
        }
    }
}
