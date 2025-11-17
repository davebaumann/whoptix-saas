using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Api.Models;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using System.Text;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<IdentityUser> _userManager;
        private readonly IEmailService _emailService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(
            ApplicationDbContext context,
            UserManager<IdentityUser> userManager,
            IEmailService emailService,
            ILogger<AdminController> logger)
        {
            _context = context;
            _userManager = userManager;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null)
        {
            var query = _context.Customers
                .Include(c => c.Tenant)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(c => 
                    c.Name.Contains(search) || 
                    c.Email.Contains(search) || 
                    c.Tenant.Name.Contains(search));
            }

            var totalCount = await query.CountAsync();
            var customers = await query
                .OrderByDescending(c => c.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new AdminCustomerResponse
                {
                    Id = c.Id,
                    ExternalId = c.ExternalId,
                    Name = c.Name,
                    Email = c.Email,
                    TenantId = c.TenantId,
                    TenantName = c.Tenant.Name,
                    LastSyncedAt = c.LastSyncedAt,
                    CreatedAt = DateTime.UtcNow, // TODO: Add CreatedAt to Customer model
                    IsActive = true // TODO: Add IsActive to Customer model
                })
                .ToListAsync();

            var response = new AdminCustomerListResponse
            {
                Customers = customers,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };

            return Ok(response);
        }

        [HttpGet("customers/{id}")]
        public async Task<IActionResult> GetCustomer(int id)
        {
            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .Where(c => c.Id == id)
                .Select(c => new AdminCustomerResponse
                {
                    Id = c.Id,
                    ExternalId = c.ExternalId,
                    Name = c.Name,
                    Email = c.Email,
                    TenantId = c.TenantId,
                    TenantName = c.Tenant.Name,
                    LastSyncedAt = c.LastSyncedAt,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                })
                .FirstOrDefaultAsync();

            if (customer == null)
            {
                return NotFound("Customer not found.");
            }

            return Ok(customer);
        }

        [HttpPost("customers")]
        public async Task<IActionResult> CreateCustomer([FromBody] AdminCustomerCreateRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check if email already exists
            var existingCustomer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Email == request.Email);
            if (existingCustomer != null)
            {
                return BadRequest("A customer with this email already exists.");
            }

            // Check if user already exists in Identity
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest("A user with this email already exists.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Create or find tenant
                var tenant = await _context.Tenants
                    .FirstOrDefaultAsync(t => t.Name == request.TenantName);
                
                if (tenant == null)
                {
                    tenant = new Tenant
                    {
                        Name = request.TenantName,
                        SkuVaultTenantToken = request.SkuVaultTenantToken,
                        SkuVaultUserToken = request.SkuVaultUserToken
                    };
                    _context.Tenants.Add(tenant);
                    await _context.SaveChangesAsync();
                }

                // Create customer
                var customer = new Customer
                {
                    ExternalId = Guid.NewGuid().ToString(), // Generate unique external ID
                    Name = request.Name,
                    Email = request.Email,
                    TenantId = tenant.Id,
                    LastSyncedAt = DateTime.UtcNow
                };

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();

                // Create Identity user
                var tempPassword = GenerateTemporaryPassword();
                var user = new IdentityUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    EmailConfirmed = true
                };

                var result = await _userManager.CreateAsync(user, tempPassword);
                if (!result.Succeeded)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(result.Errors.Select(e => e.Description));
                }

                // Assign CustomerUser role
                await _userManager.AddToRoleAsync(user, "CustomerUser");

                // Send welcome email with temporary password
                await _emailService.SendWelcomeEmailAsync(request.Email, request.Name, tempPassword);

                await transaction.CommitAsync();

                var response = new AdminCustomerResponse
                {
                    Id = customer.Id,
                    ExternalId = customer.ExternalId,
                    Name = customer.Name,
                    Email = customer.Email,
                    TenantId = customer.TenantId,
                    TenantName = tenant.Name,
                    LastSyncedAt = customer.LastSyncedAt,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, response);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to create customer {Email}", request.Email);
                return StatusCode(500, "Failed to create customer. Please try again.");
            }
        }

        [HttpPut("customers/{id}")]
        public async Task<IActionResult> UpdateCustomer(int id, [FromBody] AdminCustomerUpdateRequest request)
        {
            if (id != request.Id)
            {
                return BadRequest("ID mismatch.");
            }

            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == id);
            
            if (customer == null)
            {
                return NotFound("Customer not found.");
            }

            // Check if email already exists for another customer
            var existingCustomer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Email == request.Email && c.Id != id);
            if (existingCustomer != null)
            {
                return BadRequest("A customer with this email already exists.");
            }

            try
            {
                // Update tenant if needed
                if (customer.Tenant.Name != request.TenantName)
                {
                    var tenant = await _context.Tenants
                        .FirstOrDefaultAsync(t => t.Name == request.TenantName);
                    
                    if (tenant == null)
                    {
                        tenant = new Tenant
                        {
                            Name = request.TenantName,
                            SkuVaultTenantToken = request.SkuVaultTenantToken,
                            SkuVaultUserToken = request.SkuVaultUserToken
                        };
                        _context.Tenants.Add(tenant);
                        await _context.SaveChangesAsync();
                    }
                    
                    customer.TenantId = tenant.Id;
                }
                else
                {
                    // Update existing tenant tokens
                    customer.Tenant.SkuVaultTenantToken = request.SkuVaultTenantToken;
                    customer.Tenant.SkuVaultUserToken = request.SkuVaultUserToken;
                }

                // Update customer
                customer.Name = request.Name;
                customer.Email = request.Email;

                // Update Identity user if email changed
                var user = await _userManager.FindByEmailAsync(customer.Email);
                if (user != null && user.Email != request.Email)
                {
                    user.Email = request.Email;
                    user.UserName = request.Email;
                    await _userManager.UpdateAsync(user);
                }

                await _context.SaveChangesAsync();

                var response = new AdminCustomerResponse
                {
                    Id = customer.Id,
                    ExternalId = customer.ExternalId,
                    Name = customer.Name,
                    Email = customer.Email,
                    TenantId = customer.TenantId,
                    TenantName = customer.Tenant.Name,
                    LastSyncedAt = customer.LastSyncedAt,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update customer {Id}", id);
                return StatusCode(500, "Failed to update customer. Please try again.");
            }
        }

        [HttpDelete("customers/{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null)
            {
                return NotFound("Customer not found.");
            }

            try
            {
                // Remove related data first (transactions, inventory, etc.)
                var transactions = await _context.Transactions
                    .Where(t => t.CustomerId == id)
                    .ToListAsync();
                _context.Transactions.RemoveRange(transactions);

                var inventoryLevels = await _context.InventoryLevels
                    .Where(i => i.CustomerId == id)
                    .ToListAsync();
                _context.InventoryLevels.RemoveRange(inventoryLevels);

                // Remove customer
                _context.Customers.Remove(customer);

                // Remove Identity user
                var user = await _userManager.FindByEmailAsync(customer.Email);
                if (user != null)
                {
                    await _userManager.DeleteAsync(user);
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Customer deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete customer {Id}", id);
                return StatusCode(500, "Failed to delete customer. Please try again.");
            }
        }

        private static string GenerateTemporaryPassword()
        {
            const string chars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%";
            var random = new Random();
            var result = new StringBuilder();
            
            // Ensure password contains at least one of each required character type
            result.Append(chars[random.Next(0, 26)]); // Uppercase
            result.Append(chars[random.Next(26, 52)]); // Lowercase
            result.Append(chars[random.Next(52, 62)]); // Digit
            result.Append(chars[random.Next(62, chars.Length)]); // Special char
            
            // Add 4 more random characters
            for (int i = 0; i < 4; i++)
            {
                result.Append(chars[random.Next(chars.Length)]);
            }
            
            // Shuffle the characters
            var password = result.ToString().ToCharArray();
            for (int i = 0; i < password.Length; i++)
            {
                int j = random.Next(i, password.Length);
                (password[i], password[j]) = (password[j], password[i]);
            }
            
            return new string(password);
        }
    }
}