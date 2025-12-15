using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using SkuVaultSaaS.Api.Models;

namespace SkuVaultSaaS.Api.Services
{
    public class SkuVaultSalesService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly string _apiKey;

        public SkuVaultSalesService(HttpClient httpClient, string baseUrl, string apiKey)
        {
            _httpClient = httpClient;
            _baseUrl = baseUrl;
            _apiKey = apiKey;
        }

        public async Task<List<Sale>> GetSalesAsync(DateTime from, DateTime to)
        {
            var url = $"{_baseUrl}/api/getSales?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}&apiKey={_apiKey}";
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var sales = await response.Content.ReadFromJsonAsync<List<Sale>>();
            return sales ?? new List<Sale>();
        }
    }
}
