using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SkuVaultSaaS.Core.Models;

namespace SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi
{
    public interface ISkuVaultSalesApiClient
    {
        Task<List<Sale>> GetSalesAsync(string tenantToken, string userToken, DateTime? fromDate = null, DateTime? toDate = null);
    }
}
