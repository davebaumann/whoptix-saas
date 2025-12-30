using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Api.Models;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using System.Text;
using System.Data.Common;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _emailService;
        private readonly ILogger<AdminController> _logger;
        private readonly IEncryptionService _encryptionService;

        public AdminController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IEmailService emailService,
            ILogger<AdminController> logger,
            IEncryptionService encryptionService)
        {
            _context = context;
            _userManager = userManager;
            _emailService = emailService;
            _logger = logger;
            _encryptionService = encryptionService;
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
                        SkuVaultTenantToken = !string.IsNullOrEmpty(request.SkuVaultTenantToken) ? _encryptionService.Encrypt(request.SkuVaultTenantToken) : null,
                        SkuVaultUserToken = !string.IsNullOrEmpty(request.SkuVaultUserToken) ? _encryptionService.Encrypt(request.SkuVaultUserToken) : null
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
                var user = new ApplicationUser
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
                            SkuVaultTenantToken = !string.IsNullOrEmpty(request.SkuVaultTenantToken) ? _encryptionService.Encrypt(request.SkuVaultTenantToken) : null,
                            SkuVaultUserToken = !string.IsNullOrEmpty(request.SkuVaultUserToken) ? _encryptionService.Encrypt(request.SkuVaultUserToken) : null
                        };
                        _context.Tenants.Add(tenant);
                        await _context.SaveChangesAsync();
                    }
                    
                    customer.TenantId = tenant.Id;
                }
                else
                {
                    // Update existing tenant tokens
                    customer.Tenant.SkuVaultTenantToken = !string.IsNullOrEmpty(request.SkuVaultTenantToken) ? _encryptionService.Encrypt(request.SkuVaultTenantToken) : customer.Tenant.SkuVaultTenantToken;
                    customer.Tenant.SkuVaultUserToken = !string.IsNullOrEmpty(request.SkuVaultUserToken) ? _encryptionService.Encrypt(request.SkuVaultUserToken) : customer.Tenant.SkuVaultUserToken;
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

        [HttpGet("database-specs")]
        public async Task<IActionResult> GetDatabaseSpecs()
        {
            try
            {
                var connectionString = _context.Database.GetConnectionString();
                var databaseName = ExtractDatabaseName(connectionString);
                
                // Get database size using ExecuteSqlRaw for MySQL
                var dbSizeQuery = $@"
                    SELECT 
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS DatabaseSizeMB,
                        SUM(data_length + index_length) AS DatabaseSizeBytes
                    FROM information_schema.tables 
                    WHERE table_schema = '{databaseName}'";
                
                var dbSizeCommand = _context.Database.GetDbConnection().CreateCommand();
                dbSizeCommand.CommandText = dbSizeQuery;
                await _context.Database.OpenConnectionAsync();
                
                DatabaseSizeResult? dbSizeResult = null;
                using (var reader = await dbSizeCommand.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        dbSizeResult = new DatabaseSizeResult
                        {
                            DatabaseSizeMB = reader.IsDBNull(0) ? 0 : reader.GetDecimal(0),
                            DatabaseSizeBytes = reader.IsDBNull(1) ? 0 : reader.GetInt64(1)
                        };
                    }
                }
                
                // Get table information
                var tableInfoQuery = $@"
                    SELECT 
                        table_name as TableName,
                        COALESCE(table_rows, 0) as RowCount,
                        ROUND(COALESCE(data_length, 0) / 1024 / 1024, 2) AS DataSizeMB,
                        COALESCE(data_length, 0) as DataSizeBytes,
                        ROUND(COALESCE(index_length, 0) / 1024 / 1024, 2) AS IndexSizeMB,
                        COALESCE(index_length, 0) as IndexSizeBytes
                    FROM information_schema.tables 
                    WHERE table_schema = '{databaseName}'
                    ORDER BY (COALESCE(data_length, 0) + COALESCE(index_length, 0)) DESC";
                
                var tableCommand = _context.Database.GetDbConnection().CreateCommand();
                tableCommand.CommandText = tableInfoQuery;
                
                var tableResults = new List<TableSizeResult>();
                using (var reader = await tableCommand.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        tableResults.Add(new TableSizeResult
                        {
                            TableName = reader.GetString(0),
                            RowCount = reader.IsDBNull(1) ? 0 : reader.GetInt64(1),
                            DataSizeMB = reader.IsDBNull(2) ? 0 : reader.GetDecimal(2),
                            DataSizeBytes = reader.IsDBNull(3) ? 0 : reader.GetInt64(3),
                            IndexSizeMB = reader.IsDBNull(4) ? 0 : reader.GetDecimal(4),
                            IndexSizeBytes = reader.IsDBNull(5) ? 0 : reader.GetInt64(5)
                        });
                    }
                }
                
                await _context.Database.CloseConnectionAsync();
                
                var response = new DatabaseSpecsResponse
                {
                    DatabaseName = databaseName,
                    DatabaseSize = $"{dbSizeResult?.DatabaseSizeMB ?? 0:F2} MB",
                    DatabaseSizeBytes = dbSizeResult?.DatabaseSizeBytes ?? 0,
                    TableCount = tableResults.Count,
                    LastUpdated = DateTime.UtcNow,
                    Tables = tableResults.ToDictionary(
                        t => t.TableName,
                        t => new TableInfo
                        {
                            TableName = t.TableName,
                            RowCount = t.RowCount,
                            DataSize = $"{t.DataSizeMB:F2} MB",
                            DataSizeBytes = t.DataSizeBytes,
                            IndexSize = $"{t.IndexSizeMB:F2} MB",
                            IndexSizeBytes = t.IndexSizeBytes
                        }
                    )
                };
                
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve database specs");
                await _context.Database.CloseConnectionAsync();
                return StatusCode(500, "Failed to retrieve database specifications.");
            }
        }
        
        [HttpPost("customers/{id}/cancel")]
        public async Task<IActionResult> CancelCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null)
            {
                return NotFound("Customer not found.");
            }

            customer.IsActive = false;
            customer.CancelledAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Customer {CustomerId} ({CustomerName}) marked as cancelled", 
                customer.Id, customer.Name);
            
            return Ok(new { message = "Customer cancelled successfully. Data will be purged after 90 days of inactivity." });
        }

        [HttpGet("purge-eligible")]
        public async Task<IActionResult> GetPurgeEligibleCustomers()
        {
            var cutoffDate = DateTime.UtcNow.Subtract(TimeSpan.FromDays(90));
            
            var eligibleCustomers = await _context.Customers
                .Where(c => !c.IsActive && 
                           c.CancelledAt.HasValue && 
                           c.CancelledAt.Value <= cutoffDate &&
                           !c.ScheduledForDeletion.HasValue)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Email,
                    c.CancelledAt
                })
                .ToListAsync();
            
            var result = eligibleCustomers.Select(c => new
            {
                c.Id,
                c.Name,
                c.Email,
                c.CancelledAt,
                DaysInactive = c.CancelledAt.HasValue ? (int)(DateTime.UtcNow - c.CancelledAt.Value).TotalDays : 0
            }).ToList();
                
            return Ok(result);
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var users = await _userManager.Users
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            var userList = new List<object>();
            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                userList.Add(new
                {
                    user.Id,
                    user.Email,
                    user.UserName,
                    user.EmailConfirmed,
                    user.LockoutEnd,
                    Roles = roles,
                    user.CustomerId
                });
            }
            
            var totalCount = await _userManager.Users.CountAsync();
            
            return Ok(new
            {
                Users = userList,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest("User with this email already exists.");
            }

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                EmailConfirmed = true,
                CustomerId = request.CustomerId
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            if (!string.IsNullOrEmpty(request.Role))
            {
                await _userManager.AddToRoleAsync(user, request.Role);
            }

            return Ok(new { message = "User created successfully.", userId = user.Id });
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            user.Email = request.Email;
            user.UserName = request.Email;
            user.CustomerId = request.CustomerId;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            if (!string.IsNullOrEmpty(request.Role))
            {
                var currentRoles = await _userManager.GetRolesAsync(user);
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRoleAsync(user, request.Role);
            }

            return Ok(new { message = "User updated successfully." });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            return Ok(new { message = "User deleted successfully." });
        }

        private static string ExtractDatabaseName(string? connectionString)
        {
            if (string.IsNullOrEmpty(connectionString))
                return "Unknown";
                
            var parts = connectionString.Split(';');
            var dbPart = parts.FirstOrDefault(p => p.Trim().StartsWith("Database=", StringComparison.OrdinalIgnoreCase));
            return dbPart?.Split('=')[1] ?? "Unknown";
        }
    }
    
    // Helper classes for raw SQL queries
    public class DatabaseSizeResult
    {
        public decimal DatabaseSizeMB { get; set; }
        public long DatabaseSizeBytes { get; set; }
    }
    
    public class TableSizeResult
    {
        public string TableName { get; set; } = null!;
        public long RowCount { get; set; }
        public decimal DataSizeMB { get; set; }
        public long DataSizeBytes { get; set; }
        public decimal IndexSizeMB { get; set; }
        public long IndexSizeBytes { get; set; }
    }
}