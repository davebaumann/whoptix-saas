using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SkuVaultSaaS.Core.Models;

namespace SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi
{
    public class SkuVaultSalesApiClient : ISkuVaultSalesApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<SkuVaultSalesApiClient>? _logger;

        public SkuVaultSalesApiClient(HttpClient httpClient, ILogger<SkuVaultSalesApiClient>? logger = null)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<List<Sale>> GetSalesAsync(string tenantToken, string userToken, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var from = fromDate ?? DateTime.UtcNow.AddDays(-7);
            var to = toDate ?? DateTime.UtcNow;
            var body = new
            {
                TenantToken = tenantToken,
                UserToken = userToken,
                FromDate = from.ToString("yyyy-MM-ddTHH:mm:ss"),
                ToDate = to.ToString("yyyy-MM-ddTHH:mm:ss")
            };
            _logger?.LogInformation("SkuVault API call to sales/getSales with body: {Body}", System.Text.Json.JsonSerializer.Serialize(body));
            var response = await _httpClient.PostAsJsonAsync("sales/getSales", body);
            var raw = await response.Content.ReadAsStringAsync();
            _logger?.LogInformation("SkuVault API call to sales/getSales returned {Status} with {Length} bytes", (int)response.StatusCode, raw?.Length ?? 0);
            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogWarning("SkuVault sales call failed: {Status}. Raw (first 300): {Preview}", (int)response.StatusCode, raw?.Substring(0, Math.Min(300, raw.Length)));
                throw new HttpRequestException($"SkuVault API error: {response.StatusCode}");
            }
            try
            {
                var sales = System.Text.Json.JsonSerializer.Deserialize<List<Sale>>(raw ?? string.Empty, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return sales ?? new List<Sale>();
            }
            catch (System.Text.Json.JsonException ex)
            {
                _logger?.LogError(ex, "Failed to parse sales response JSON");
                throw new HttpRequestException($"Invalid sales response JSON: {ex.Message}");
            }
        }
    }
}
