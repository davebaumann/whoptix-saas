using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Enums;
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
        Task<CustomerRole?> GetCurrentUserRoleAsync();
        Task<bool> CanManageUsersAsync();
        Task<bool> CanInviteUsersAsync();
    }

    public class UserContextService : IUserContextService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserContextService> _logger;

        public UserContextService(
            IHttpContextAccessor httpContextAccessor,
            UserManager<ApplicationUser> userManager,
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
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return null;

            // Admins don't have an associated customer
            if (IsAdmin()) return null;

            var user = await _userManager.FindByIdAsync(userId);
            return user?.CustomerId;
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

        public async Task<CustomerRole?> GetCurrentUserRoleAsync()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId)) return null;

            var user = await _userManager.FindByIdAsync(userId);
            return user?.CustomerRole;
        }

        public async Task<bool> CanManageUsersAsync()
        {
            if (IsAdmin()) return true;
            
            var role = await GetCurrentUserRoleAsync();
            return role == CustomerRole.Owner;
        }

        public async Task<bool> CanInviteUsersAsync()
        {
            if (IsAdmin()) return true;
            
            var role = await GetCurrentUserRoleAsync();
            return role == CustomerRole.Owner || role == CustomerRole.Admin;
        }
    }
}