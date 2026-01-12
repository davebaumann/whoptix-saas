using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Services;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Infrastructure.Services;
using SkuVaultSaaS.Api.Models;
using SkuVaultSaaS.Api.Services;
using System.Text.Json.Serialization;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CustomersController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ISkuVaultSyncService _syncService;
        private readonly IEncryptionService _encryptionService;
        private readonly IServiceProvider _serviceProvider;

        public CustomersController(
            ApplicationDbContext context, 
            ILogger<CustomersController> logger, 
            UserManager<ApplicationUser> userManager, 
            ISkuVaultSyncService syncService,
            IEncryptionService encryptionService,
            IServiceProvider serviceProvider)
        {
            _context = context;
            _logger = logger;
            _userManager = userManager;
            _syncService = syncService;
            _encryptionService = encryptionService;
            _serviceProvider = serviceProvider;
        }

        // GET: api/customers
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Customer>>> GetCustomers()
        {
            return await _context.Customers.Include(c => c.Tenant).ToListAsync();
        }

        // GET: api/customers/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetCustomer(int id)
        {
            var customer = await _context.Customers
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (customer == null)
                return NotFound();

            return customer;
        }

        // POST: api/customers
        [HttpPost]
        public async Task<ActionResult<Customer>> PostCustomer([FromBody] CustomerCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Ensure Tenant exists
            var tenantExists = await _context.Tenants.AnyAsync(t => t.Id == dto.TenantId);
            if (!tenantExists)
                return BadRequest($"Tenant with ID {dto.TenantId} does not exist.");

            var customer = new Customer
            {
                ExternalId = dto.ExternalId,
                Name = dto.Name,
                Email = dto.Email,
                TenantId = dto.TenantId
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
        }

        // PUT: api/customers/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCustomer(int id, [FromBody] CustomerUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var customer = await _context.Customers.FindAsync(id);
            if (customer == null) return NotFound();

            // If tenant is changing, ensure new tenant exists
            if (dto.TenantId != customer.TenantId)
            {
                var tenantExists = await _context.Tenants.AnyAsync(t => t.Id == dto.TenantId);
                if (!tenantExists) return BadRequest($"Tenant with ID {dto.TenantId} does not exist.");
            }

            customer.ExternalId = dto.ExternalId;
            customer.Name = dto.Name;
            customer.Email = dto.Email;
            customer.TenantId = dto.TenantId;

            _context.Customers.Update(customer);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/customers/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null) return NotFound();

            _context.Customers.Remove(customer);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/customers/connect-skuvault
        [HttpPost("connect-skuvault")]
        public async Task<IActionResult> ConnectSkuVault([FromBody] ConnectSkuVaultRequest request)
        {
            try
            {
                _logger.LogInformation("ConnectSkuVault called for email: {Email}", request.Email);

                // Get the current authenticated user
                var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
                            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                            User.FindFirst("sub")?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("User ID not found in token");
                    return Unauthorized(new { message = "User authentication required" });
                }

                var appUser = await _userManager.FindByIdAsync(userId);
                if (appUser == null || appUser.CustomerId == null)
                {
                    _logger.LogWarning("Customer not linked to user {UserId}", userId);
                    return BadRequest(new { message = "No customer account found. Please complete payment first." });
                }

                // Get the customer linked to this user
                var customer = await _context.Customers
                    .Include(c => c.Tenant)
                    .FirstOrDefaultAsync(c => c.Id == appUser.CustomerId);

                if (customer == null)
                {
                    _logger.LogWarning("Customer {CustomerId} not found for user {UserId}", appUser.CustomerId, userId);
                    return NotFound(new { message = "Customer not found" });
                }

                // Get the tenant
                var tenant = customer.Tenant;
                if (tenant == null)
                {
                    _logger.LogWarning("Tenant not found for customer {CustomerId}", customer.Id);
                    return NotFound(new { message = "Tenant not found" });
                }

                // Validate SkuVault credentials
                if (!ValidateSkuVaultCredentials(request.Email, request.Password))
                {
                    _logger.LogWarning("Invalid SkuVault credentials for customer {CustomerId}", customer.Id);
                    return BadRequest(new { message = "Invalid SkuVault credentials. Please check your email and password." });
                }

                // Get SkuVault tokens using the credentials
                _logger.LogInformation("Fetching SkuVault tokens for email: {Email}", request.Email);
                var tokens = await GetSkuVaultTokens(request.Email, request.Password);
                
                if (tokens == null)
                {
                    _logger.LogError("Failed to retrieve SkuVault tokens for email: {Email}", request.Email);
                    return BadRequest(new { message = "Failed to authenticate with SkuVault. Please verify your credentials." });
                }

                _logger.LogInformation("Successfully retrieved SkuVault tokens. AccountId: {AccountId}", tokens.AccountId);

                // Update tenant with encrypted credentials and tokens
                tenant.SkuVaultEmail = request.Email;
                tenant.SkuVaultPassword = _encryptionService.Encrypt(request.Password);
                tenant.SkuVaultAccountId = tokens.AccountId;
                tenant.SkuVaultTenantToken = _encryptionService.Encrypt(tokens.TenantToken);
                tenant.SkuVaultUserToken = _encryptionService.Encrypt(tokens.UserToken);

                _context.Tenants.Update(tenant);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully connected SkuVault for tenant {TenantId} with AccountId {AccountId}", tenant.Id, tokens.AccountId);

                // Enable sync for this customer
                customer.IsActive = true;
                _context.Customers.Update(customer);
                await _context.SaveChangesAsync();

                // Initiate a full sync of customer data immediately using a proper scope
                _logger.LogInformation("Initiating immediate sync for customer {CustomerId} after SkuVault connection", customer.Id);
                _ = Task.Run(async () =>
                {
                    try
                    {
                        // Create a new scope for the background task to get a fresh DbContext
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            var syncService = scope.ServiceProvider.GetRequiredService<ISkuVaultSyncService>();
                            await syncService.SyncCustomerDataAsync(customer.Id);
                            _logger.LogInformation("Completed initial sync for customer {CustomerId}", customer.Id);
                        }
                    }
                    catch (Exception syncEx)
                    {
                        _logger.LogError(syncEx, "Error during initial sync for customer {CustomerId}", customer.Id);
                    }
                });

                return Ok(new { message = "SkuVault account connected successfully. Sync is now enabled and data is being synchronized." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting SkuVault for email: {Email}", request.Email);
                return StatusCode(500, new { message = "An error occurred while connecting your SkuVault account" });
            }
        }

        private bool ValidateSkuVaultCredentials(string email, string password)
        {
            try
            {
                // TODO: Implement actual SkuVault API validation
                // For now, just check that both fields are non-empty
                return !string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to validate SkuVault credentials");
                return false;
            }
        }

        private async Task<SkuVaultTokensResponse?> GetSkuVaultTokens(string email, string password)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    // Set a 10 second timeout
                    client.Timeout = TimeSpan.FromSeconds(10);
                    
                    // SkuVault /gettokens endpoint - try form-encoded data
                    var formData = new Dictionary<string, string>
                    {
                        { "Email", email },
                        { "Password", password }
                    };

                    var content = new FormUrlEncodedContent(formData);

                    _logger.LogInformation("Calling SkuVault /gettokens endpoint for email: {Email}", email);
                    
                    var response = await client.PostAsync("https://app.skuvault.com/api/gettokens?format=json", content);

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("SkuVault /gettokens failed with status {StatusCode}: {Error}", response.StatusCode, errorContent);
                        return null;
                    }

                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogDebug("SkuVault /gettokens response: {Response}", responseContent);
                    
                    try
                    {
                        var tokens = System.Text.Json.JsonSerializer.Deserialize<SkuVaultTokenResponse>(responseContent);
                        
                        // Check if we have at least the TenantToken and UserToken
                        if (tokens == null || string.IsNullOrEmpty(tokens.TenantToken) || string.IsNullOrEmpty(tokens.UserToken))
                        {
                            _logger.LogWarning("SkuVault /gettokens returned invalid tokens. Response: {Response}", responseContent);
                            return null;
                        }

                        return new SkuVaultTokensResponse
                        {
                            AccountId = tokens.AccountId,
                            TenantToken = tokens.TenantToken,
                            UserToken = tokens.UserToken
                        };
                    }
                    catch (System.Text.Json.JsonException jsonEx)
                    {
                        _logger.LogError(jsonEx, "Failed to parse SkuVault response as JSON. Response: {Response}", responseContent);
                        return null;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling SkuVault /gettokens endpoint");
                return null;
            }
        }

        // POST: api/customers/test-skuvault
        [HttpPost("test-skuvault")]
        public IActionResult TestSkuVault([FromBody] TestSkuVaultRequest request)
        {
            try
            {
                _logger.LogInformation("TestSkuVault called");

                if (!ValidateSkuVaultCredentials(request.Email, request.Password))
                {
                    return BadRequest(new { message = "Invalid SkuVault email or password" });
                }

                return Ok(new { message = "Credentials verified successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing SkuVault credentials");
                return StatusCode(500, new { message = "An error occurred while testing credentials" });
            }
        }

        // POST: api/customers/update-skuvault-credentials
        [HttpPost("update-skuvault-credentials")]
        public async Task<IActionResult> UpdateSkuVaultCredentials([FromBody] UpdateSkuVaultRequest request)
        {
            try
            {
                _logger.LogInformation("UpdateSkuVaultCredentials called");

                var userEmail = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value 
                    ?? User.FindFirst(JwtRegisteredClaimNames.Email)?.Value
                    ?? User.FindFirst("email")?.Value;
                    
                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning("User email not found in claims");
                    return Unauthorized(new { message = "User not authenticated" });
                }

                _logger.LogInformation("UpdateSkuVaultCredentials for user: {Email}", userEmail);

                var customer = await _context.Customers
                    .Include(c => c.Tenant)
                    .FirstOrDefaultAsync(c => c.Email.ToLower() == userEmail.ToLower());

                if (customer == null)
                {
                    _logger.LogWarning("Customer not found for email: {Email}", userEmail);
                    return NotFound(new { message = "Customer not found" });
                }

                var tenant = customer.Tenant;
                tenant.SkuVaultEmail = request.Email;
                tenant.SkuVaultPassword = _encryptionService.Encrypt(request.Password);

                _context.Tenants.Update(tenant);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated SkuVault credentials for tenant {TenantId}", tenant.Id);

                return Ok(new { message = "Credentials updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating SkuVault credentials");
                return StatusCode(500, new { message = "An error occurred while updating credentials" });
            }
        }

        // POST: api/customers/refresh-skuvault-tokens
        [HttpPost("refresh-skuvault-tokens")]
        public async Task<IActionResult> RefreshSkuVaultTokens()
        {
            try
            {
                _logger.LogInformation("RefreshSkuVaultTokens called");

                var userEmail = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value 
                    ?? User.FindFirst(JwtRegisteredClaimNames.Email)?.Value
                    ?? User.FindFirst("email")?.Value;
                    
                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning("User email not found in claims");
                    return Unauthorized(new { message = "User not authenticated" });
                }

                _logger.LogInformation("RefreshSkuVaultTokens for user: {Email}", userEmail);

                var customer = await _context.Customers
                    .Include(c => c.Tenant)
                    .FirstOrDefaultAsync(c => c.Email.ToLower() == userEmail.ToLower());

                if (customer == null)
                {
                    return NotFound(new { message = "Customer not found" });
                }

                var tenant = customer.Tenant;
                if (string.IsNullOrEmpty(tenant.SkuVaultEmail) || string.IsNullOrEmpty(tenant.SkuVaultPassword))
                {
                    return BadRequest(new { message = "SkuVault credentials not configured" });
                }

                // Decrypt the stored password for SkuVault API call
                var decryptedPassword = _encryptionService.Decrypt(tenant.SkuVaultPassword);

                // Call GetSkuVaultTokens to refresh the tokens
                var tokens = await GetSkuVaultTokens(tenant.SkuVaultEmail, decryptedPassword);
                if (tokens == null)
                {
                    return BadRequest(new { message = "Failed to retrieve SkuVault tokens" });
                }

                // Update tenant with newly encrypted tokens
                tenant.SkuVaultAccountId = tokens.AccountId;
                tenant.SkuVaultTenantToken = _encryptionService.Encrypt(tokens.TenantToken);
                tenant.SkuVaultUserToken = _encryptionService.Encrypt(tokens.UserToken);

                _context.Tenants.Update(tenant);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully refreshed SkuVault tokens for tenant {TenantId}", tenant.Id);

                return Ok(new { message = "SkuVault tokens refreshed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing SkuVault tokens");
                return StatusCode(500, new { message = "An error occurred while refreshing tokens" });
            }
        }
    }

    public class TestSkuVaultRequest
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateSkuVaultRequest
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
    }

    public class SkuVaultTokensResponse
    {
        public string? AccountId { get; set; }
        public string? TenantToken { get; set; }
        public string? UserToken { get; set; }
    }

    public class SkuVaultTokenResponse
    {
        [JsonPropertyName("Success")]
        public bool Success { get; set; }

        [JsonPropertyName("AccountId")]
        public string? AccountId { get; set; }

        [JsonPropertyName("TenantToken")]
        public string? TenantToken { get; set; }

        [JsonPropertyName("UserToken")]
        public string? UserToken { get; set; }
    }

    public class ConnectSkuVaultRequest
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
    }
}
