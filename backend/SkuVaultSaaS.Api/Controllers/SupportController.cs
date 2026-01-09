using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkuVaultSaaS.Infrastructure.Services;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/techsupport")]
    public class TechSupportController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly ILogger<TechSupportController> _logger;

        public TechSupportController(IEmailService emailService, ILogger<TechSupportController> logger)
        {
            _emailService = emailService;
            _logger = logger;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> SendSupportRequest([FromBody] SupportRequest request)
        {
            _logger.LogInformation("Tech support request received from {Email}", request.UserEmail);
            
            try
            {
                await _emailService.SendTechSupportRequestAsync(
                    request.UserEmail,
                    request.Priority,
                    request.Category,
                    request.Subject,
                    request.Message
                );

                _logger.LogInformation("Tech support request sent successfully from {Email}", request.UserEmail);
                return Ok(new { message = "Support request sent successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending tech support request from {Email}", request.UserEmail);
                return StatusCode(500, new { error = "Failed to send support request" });
            }
        }

        [HttpGet("test")]
        [AllowAnonymous]
        public IActionResult Test()
        {
            _logger.LogInformation("TechSupport test endpoint hit");
            return Ok(new { message = "TechSupport controller is working", timestamp = DateTime.UtcNow });
        }
    }
}