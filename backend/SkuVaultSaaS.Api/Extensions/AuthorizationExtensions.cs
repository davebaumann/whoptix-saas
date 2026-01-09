using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;

namespace SkuVaultSaaS.Api.Extensions
{
    /// <summary>
    /// Extension methods for authorization and tenant isolation
    /// </summary>
    public static class AuthorizationExtensions
    {
        /// <summary>
        /// Gets the current user's email from claims
        /// </summary>
        public static string? GetUserEmail(this ControllerBase controller)
        {
            return controller.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value 
                ?? controller.User.FindFirst("email")?.Value;
        }

        /// <summary>
        /// Validates that the current user owns the customer before returning data
        /// Prevents horizontal privilege escalation (accessing other customer's data)
        /// </summary>
        public static async Task<bool> UserOwnsCustomerAsync(
            this ControllerBase controller,
            ApplicationDbContext context,
            int customerId)
        {
            var userEmail = controller.GetUserEmail();
            if (string.IsNullOrEmpty(userEmail))
                return false;

            // Get user's customer
            var userCustomer = await context.Customers
                .FirstOrDefaultAsync(c => c.Email == userEmail);

            if (userCustomer == null)
                return false;

            // Verify the requested customer ID matches the user's customer ID
            return userCustomer.Id == customerId;
        }

        /// <summary>
        /// Validates that the current user owns the tenant
        /// </summary>
        public static async Task<bool> UserOwnsTenantAsync(
            this ControllerBase controller,
            ApplicationDbContext context,
            int tenantId)
        {
            var userEmail = controller.GetUserEmail();
            if (string.IsNullOrEmpty(userEmail))
                return false;

            // Get user's tenant through customer
            var userCustomer = await context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Email == userEmail);

            if (userCustomer?.Tenant == null)
                return false;

            // Verify the requested tenant ID matches the user's tenant ID
            return userCustomer.Tenant.Id == tenantId;
        }
    }
}
