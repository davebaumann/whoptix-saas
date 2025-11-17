using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Api.Models;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CustomersController(ApplicationDbContext context)
        {
            _context = context;
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
    }
}
