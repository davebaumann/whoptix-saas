using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using System.Security.Claims;

namespace SkuVaultSaaS.Api.Services
{
    public interface IUserContextService
    {
        Task<int?> GetCurrentCustomerIdAsync();
        Task<bool> CanAccessCustomerAsync(int customerId);
        Task<List<int>> GetAccessibleCustomerIdsAsync();
        bool IsAdmin();
        string? GetCurrentUserId();
        string? GetCurrentUserEmail();
    }

    public class UserContextService : IUserContextService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<IdentityUser> _userManager;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserContextService> _logger;

        public UserContextService(
            IHttpContextAccessor httpContextAccessor,
            UserManager<IdentityUser> userManager,
            ApplicationDbContext context,
            ILogger<UserContextService> logger)
        {
            _httpContextAccessor = httpContextAccessor;
            _userManager = userManager;
            _context = context;
            _logger = logger;
        }

        public string? GetCurrentUserId()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return null;

            return user.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                   user.FindFirst("sub")?.Value;
        }

        public string? GetCurrentUserEmail()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return null;

            return user.FindFirst(ClaimTypes.Email)?.Value ??
                   user.FindFirst(ClaimTypes.Name)?.Value;
        }

        public bool IsAdmin()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return false;

            return user.IsInRole("Admin");
        }

        public async Task<int?> GetCurrentCustomerIdAsync()
        {
            var userEmail = GetCurrentUserEmail();
            if (string.IsNullOrEmpty(userEmail)) return null;

            // Admins don't have an associated customer
            if (IsAdmin()) return null;

            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Email == userEmail);

            return customer?.Id;
        }

        public async Task<bool> CanAccessCustomerAsync(int customerId)
        {
            // Admins can access any customer for management purposes
            if (IsAdmin()) return true;

            var currentCustomerId = await GetCurrentCustomerIdAsync();
            return currentCustomerId == customerId;
        }

        public async Task<List<int>> GetAccessibleCustomerIdsAsync()
        {
            if (IsAdmin())
            {
                // Admins can access all customers for management
                return await _context.Customers
                    .Select(c => c.Id)
                    .ToListAsync();
            }

            var currentCustomerId = await GetCurrentCustomerIdAsync();
            return currentCustomerId.HasValue 
                ? new List<int> { currentCustomerId.Value }
                : new List<int>();
        }
    }
}