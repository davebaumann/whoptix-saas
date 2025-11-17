using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/admin/tenants")]
    [Authorize(Roles = "Admin")]
    public class TenantAdminController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public TenantAdminController(ApplicationDbContext db)
        {
            _db = db;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Tenant>> GetTenant(int id)
        {
            var tenant = await _db.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            // Do not return the secret token in the GET; caller can request it via a separate secure channel if needed.
            tenant.SkuVaultTenantToken = null;
            return tenant;
        }

        public class SkuVaultTokenDto { public string Token { get; set; } = string.Empty; }

        [HttpPut("{id}/skuvault-token")]
        public async Task<IActionResult> SetSkuVaultToken(int id, [FromBody] SkuVaultTokenDto dto)
        {
            var tenant = await _db.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            tenant.SkuVaultTenantToken = dto.Token;
            _db.Tenants.Update(tenant);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
