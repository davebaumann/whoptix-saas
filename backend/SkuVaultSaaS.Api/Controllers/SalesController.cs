using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Infrastructure.Data;
using System.Security.Claims;
using SkuVaultSaaS.Api.Services;
using SkuVaultSaaS.Core.Models;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SalesController : ControllerBase
    {
        private readonly SkuVaultSalesService _salesService;

        public SalesController(SkuVaultSalesService salesService)
        {
            _salesService = salesService;
        }

        [HttpGet]
        public async Task<ActionResult<List<Sale>>> GetSales([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
            var toDate = to ?? DateTime.UtcNow;
            var sales = await _salesService.GetSalesAsync(fromDate, toDate);
            return Ok(sales);
        }
    }
}
