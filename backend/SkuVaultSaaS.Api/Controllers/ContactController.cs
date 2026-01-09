using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkuVaultSaaS.Infrastructure.Services;
using System.Security.Claims;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContactController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly ILogger<ContactController> _logger;

        public ContactController(IEmailService emailService, ILogger<ContactController> logger)
        {
            _emailService = emailService;
            _logger = logger;
            _logger.LogInformation("ContactController instantiated");
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> SendContactMessage([FromBody] ContactMessageRequest request)
        {
            _logger.LogInformation("Contact form submission received: {Subject}", request.Subject);
            
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                // For anonymous users, use the email from the request
                var userEmail = request.UserEmail;
                
                if (string.IsNullOrEmpty(userEmail))
                {
                    // Try to get from authenticated user if available
                    userEmail = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value 
                        ?? User.FindFirst(ClaimTypes.Email)?.Value 
                        ?? User.FindFirst("email")?.Value;
                }

                if (string.IsNullOrEmpty(userEmail))
                    return BadRequest("Email address is required");

                _logger.LogInformation("Sending contact message from {UserEmail}", userEmail);
                
                // Send email to support team using the suggestion method
                await _emailService.SendSuggestionEmailAsync(
                    userEmail,
                    $"Subject: {request.Subject}\n\n{request.Message}"
                );

                _logger.LogInformation("Contact message sent from {UserEmail}: {Subject}", userEmail, request.Subject);

                return Ok(new { message = "Thank you for contacting us! We'll get back to you soon." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending contact message");
                return StatusCode(500, new { error = "Failed to send message" });
            }
        }
        
        [HttpGet("test")]
        [AllowAnonymous]
        public IActionResult Test()
        {
            _logger.LogInformation("Contact test endpoint hit");
            return Ok(new { message = "Contact controller is working", timestamp = DateTime.UtcNow });
        }
        [HttpPost("support")]
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
    }

    public class ContactMessageRequest
    {
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? UserEmail { get; set; }
        public DateTime? SubmittedAt { get; set; }
    }

    public class SupportRequest
    {
        public string UserEmail { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
