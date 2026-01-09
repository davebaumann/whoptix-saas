using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.Services;
using System.Security.Claims;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SuggestionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SuggestionsController> _logger;
        private readonly IEmailService _emailService;

        public SuggestionsController(ApplicationDbContext context, ILogger<SuggestionsController> logger, IEmailService emailService)
        {
            _context = context;
            _logger = logger;
            _emailService = emailService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateSuggestion([FromBody] CreateSuggestionRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userEmail = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value 
                    ?? User.FindFirst(ClaimTypes.Email)?.Value 
                    ?? User.FindFirst("email")?.Value;

                if (string.IsNullOrEmpty(userEmail))
                    return Unauthorized("Could not determine user email");

                // Send email with suggestion instead of saving to database
                await _emailService.SendSuggestionEmailAsync(userEmail, request.Message);

                _logger.LogInformation($"Suggestion email sent from {userEmail}");

                return Ok(new { message = "Thank you for your suggestion! We've received your feedback." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting suggestion");
                return StatusCode(500, new { error = "Failed to submit suggestion" });
            }
        }

        [HttpGet]
        [Authorize(Roles = "SystemAdmin,AccountAdmin")]
        public async Task<IActionResult> GetSuggestions([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var suggestions = await _context.Suggestions
                    .OrderByDescending(s => s.CreatedAt)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(s => new
                    {
                        s.Id,
                        s.Message,
                        s.UserEmail,
                        s.SubmittedAt,
                        s.IsRead,
                        s.CreatedAt
                    })
                    .ToListAsync();

                var totalCount = await _context.Suggestions.CountAsync();

                return Ok(new
                {
                    data = suggestions,
                    totalCount,
                    pageNumber,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving suggestions");
                return StatusCode(500, new { error = "Failed to retrieve suggestions" });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "SystemAdmin,AccountAdmin")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var suggestion = await _context.Suggestions.FindAsync(id);
                if (suggestion == null)
                    return NotFound();

                suggestion.IsRead = true;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Suggestion marked as read" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking suggestion as read");
                return StatusCode(500, new { error = "Failed to update suggestion" });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> DeleteSuggestion(int id)
        {
            try
            {
                var suggestion = await _context.Suggestions.FindAsync(id);
                if (suggestion == null)
                    return NotFound();

                _context.Suggestions.Remove(suggestion);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Suggestion deleted" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting suggestion");
                return StatusCode(500, new { error = "Failed to delete suggestion" });
            }
        }
    }

    public class CreateSuggestionRequest
    {
        public string Message { get; set; } = string.Empty;
        public string? UserEmail { get; set; }
        public DateTime? SubmittedAt { get; set; }
    }
}
