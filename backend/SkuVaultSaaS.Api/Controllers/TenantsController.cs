using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Api.Models;
using SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi;
using SkuVaultSaaS.Api.Services;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TenantsController : ControllerBase
    {
    private readonly ApplicationDbContext _context;
    private readonly ISkuVaultApiClient _svClient;
    private readonly IConfiguration _configuration;

        public TenantsController(ApplicationDbContext context, ISkuVaultApiClient svClient, IConfiguration configuration)
        {
            _context = context;
            _svClient = svClient;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Tenant>>> GetTenants()
        {
            return await _context.Tenants.Include(t => t.Customers).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Tenant>> GetTenant(int id)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Customers)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tenant == null)
                return NotFound();

            return tenant;
        }

        [HttpPost]
        public async Task<ActionResult<Tenant>> PostTenant([FromBody] TenantCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var tenant = new Tenant
            {
                Name = dto.Name,
                SkuVaultAccountId = dto.SkuVaultAccountId
            };

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
        }

        // PUT: api/tenants/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTenant(int id, [FromBody] TenantUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            tenant.Name = dto.Name;
            tenant.SkuVaultAccountId = dto.SkuVaultAccountId;

            _context.Tenants.Update(tenant);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/tenants/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTenant(int id)
        {
            var tenant = await _context.Tenants.Include(t => t.Customers).FirstOrDefaultAsync(t => t.Id == id);
            if (tenant == null) return NotFound();

            // If there are customers, optionally cascade delete or prevent deletion. We'll cascade-delete customers here.
            _context.Customers.RemoveRange(tenant.Customers);
            _context.Tenants.Remove(tenant);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{id}/credentials")]
        public async Task<IActionResult> PutTenantCredentials(int id, [FromBody] TenantCredentialsDto dto)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            tenant.SkuVaultEmail = dto.Email;
            // Encrypt the password before storing
            tenant.SkuVaultPassword = EncryptPassword(dto.Password);
            _context.Tenants.Update(tenant);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id}/tokens/refresh")]
        public async Task<ActionResult<TenantTokensDto>> RefreshTokens(int id, [FromBody] TenantCredentialsDto? dto)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            var email = dto?.Email ?? tenant.SkuVaultEmail;
            // Decrypt the stored password or use provided password
            var password = dto?.Password ?? (tenant.SkuVaultPassword != null ? DecryptPassword(tenant.SkuVaultPassword) : null);
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                return BadRequest(new { message = "Missing SkuVault Email/Password" });
            }

            var tokens = await _svClient.GetTokensAsync(email!, password!);
            tenant.SkuVaultTenantToken = tokens.TenantToken;
            tenant.SkuVaultUserToken = tokens.UserToken;
            await _context.SaveChangesAsync();

            return Ok(new TenantTokensDto { TenantToken = tokens.TenantToken, UserToken = tokens.UserToken });
        }

        private string EncryptPassword(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return plainText;

            var encryptionService = new AesEncryptionService(_configuration);
            return encryptionService.Encrypt(plainText);
        }

        private string DecryptPassword(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return cipherText;

            try
            {
                var encryptionService = new AesEncryptionService(_configuration);
                return encryptionService.Decrypt(cipherText);
            }
            catch
            {
                // If decryption fails, assume it's already plain text (for backward compatibility)
                return cipherText;
            }
        }
    }
}
