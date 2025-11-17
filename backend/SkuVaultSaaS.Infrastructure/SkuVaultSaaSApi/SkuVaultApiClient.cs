using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi
{
    public class SkuVaultApiClient : ISkuVaultApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly SkuVaultApiOptions _options;
        private readonly ILogger<SkuVaultApiClient>? _logger;

        public SkuVaultApiClient(HttpClient httpClient, IOptions<SkuVaultApiOptions> options, ILogger<SkuVaultApiClient>? logger = null)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
            
            // Configure base URL from options
            if (!string.IsNullOrEmpty(_options.BaseUrl))
            {
                _httpClient.BaseAddress = new Uri(_options.BaseUrl);
            }
            
            // Configure default headers
            _httpClient.DefaultRequestHeaders.Accept.Clear();
            _httpClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
    }

        public async Task<SkuVaultTokensDto> GetTokensAsync(string email, string password)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                throw new ArgumentException("Email and password are required");
            }

            var body = new { Email = email, Password = password };
            var response = await _httpClient.PostAsJsonAsync("getTokens", body);
            var raw = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogError("SkuVault getTokens failed {Status}: {Body}", (int)response.StatusCode, Truncate(raw));
                throw new HttpRequestException($"{(int)response.StatusCode}: {raw}");
            }

            try
            {
                using var doc = JsonDocument.Parse(raw);
                var tenantToken = doc.RootElement.GetProperty("TenantToken").GetString();
                var userToken = doc.RootElement.GetProperty("UserToken").GetString();

                if (string.IsNullOrWhiteSpace(tenantToken) || string.IsNullOrWhiteSpace(userToken))
                {
                    throw new HttpRequestException("SkuVault getTokens returned empty tokens");
                }

                _logger?.LogInformation("SkuVault tokens acquired successfully");
                return new SkuVaultTokensDto
                {
                    TenantToken = tenantToken,
                    UserToken = userToken
                };
            }
            catch (JsonException ex)
            {
                _logger?.LogError(ex, "Failed to parse SkuVault getTokens response: {Body}", Truncate(raw));
                throw new HttpRequestException($"Invalid getTokens response: {ex.Message}");
            }
        }

    public async Task<List<SkuVaultProductDto>> GetProductsAsync(string tenantToken, string userToken)
        {
            EnsureTenantToken(tenantToken);
            EnsureUserToken(userToken);
            
            // Try without pagination parameters first - some SkuVault endpoints don't require them
            // or use different parameter names
            return await PostAndParseListWithRetry<SkuVaultProductDto>( 
                "products/getProducts",
                token => new { TenantToken = tenantToken, UserToken = userToken },
                "Products", userToken);
        }

    public async Task<List<SkuVaultLocationDto>> GetLocationsAsync(string tenantToken, string userToken)
        {
            EnsureTenantToken(tenantToken);
            EnsureUserToken(userToken);
            return await PostAndParseListWithRetry<SkuVaultLocationDto>(
                "inventory/getLocations",
                token => new { TenantToken = tenantToken, UserToken = userToken },
                "Items", userToken);
        }

    public async Task<List<SkuVaultInventoryDto>> GetInventoryAsync(string tenantToken, string userToken)
        {
            EnsureTenantToken(tenantToken);
            EnsureUserToken(userToken);
            
            // Inventory endpoint returns a dictionary structure, not an array
            var body = new { TenantToken = tenantToken, UserToken = userToken };
            _logger?.LogInformation($"SkuVault API call to inventory/getInventoryByLocation with body: {JsonSerializer.Serialize(body)}");
            
            var response = await _httpClient.PostAsJsonAsync("inventory/getInventoryByLocation", body);
            var raw = await response.Content.ReadAsStringAsync();
            
            _logger?.LogInformation($"SkuVault API call to inventory/getInventoryByLocation succeeded with {raw?.Length ?? 0} bytes response");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogWarning($"SkuVault API returned {response.StatusCode}");
                throw new HttpRequestException($"SkuVault API error: {response.StatusCode}");
            }
            
            return ParseInventoryDictionary(raw ?? string.Empty);
        }

    public async Task<List<SkuVaultInventoryMovementDto>> GetInventoryMovementsAsync(string tenantToken, string userToken, DateTime? fromDate = null, DateTime? toDate = null)
        {
            EnsureTenantToken(tenantToken);
            EnsureUserToken(userToken);

            // Default date range: last 7 days to now
            var from = fromDate ?? DateTime.UtcNow.AddDays(-7);
            var to = toDate ?? DateTime.UtcNow;

            var body = new
            {
                TenantToken = tenantToken,
                UserToken = userToken,
                FromDate = from.ToString("yyyy-MM-ddTHH:mm:ss"),
                ToDate = to.ToString("yyyy-MM-ddTHH:mm:ss")
            };

            _logger?.LogInformation("SkuVault API call to inventory/getTransactions with body: {Body}", System.Text.Json.JsonSerializer.Serialize(body));
            var response = await _httpClient.PostAsJsonAsync("inventory/getTransactions", body);
            var raw = await response.Content.ReadAsStringAsync();

            _logger?.LogInformation("SkuVault API call to inventory/getTransactions returned {Status} with {Length} bytes", (int)response.StatusCode, raw?.Length ?? 0);

            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogWarning("SkuVault transactions call failed: {Status}. Raw (first 300): {Preview}", (int)response.StatusCode, Truncate(raw ?? string.Empty, 300));
                throw CreateHttpException(response, raw ?? string.Empty);
            }

            return ParseTransactionsArray(raw ?? string.Empty);
        }

    private void EnsureUserToken(string userToken)
        {
            if (string.IsNullOrWhiteSpace(userToken))
            {
                throw new InvalidOperationException("SkuVault UserToken not provided");
            }
        }

        private async Task<List<T>> PostAndParseListWithRetry<T>(string relativePath, Func<string?, object> buildBody, string primaryArrayProperty, string userToken)
        {
            // First attempt with provided UserToken
            var attemptBody = buildBody(userToken);
            
            // Log the request details for debugging
            _logger?.LogInformation("SkuVault API call to {Path} with body: {Body}", relativePath, System.Text.Json.JsonSerializer.Serialize(attemptBody));
            
            var (response, raw) = await SendPostAsync(relativePath, attemptBody);

            if (response.IsSuccessStatusCode)
            {
                _logger?.LogInformation("SkuVault API call to {Path} succeeded with {Length} bytes response", relativePath, raw?.Length ?? 0);
                return ParseListFromRaw<T>(raw ?? string.Empty, primaryArrayProperty);
            }

            var status = (int)response.StatusCode;
            _logger?.LogWarning("SkuVault call {Path} failed on first attempt with {Status}. Body: {Body}", relativePath, status, Truncate(raw ?? string.Empty));

            // If unauthorized, no auto-refresh since we use pre-configured tokens
                if (status == 401) 
            {
                _logger?.LogError("SkuVault 401 Unauthorized - check UserToken and TenantToken configuration");
                throw CreateHttpException(response, raw ?? string.Empty);
            }

            // If not found, try a few fallback route variants and base URLs
            if (status == 404)
            {
                foreach (var alt in GetAlternatePaths(relativePath))
                {
                    _logger?.LogInformation("Trying alternate SkuVault path: {Alt}", alt);
                        (response, raw) = await SendPostAsync(alt, buildBody(userToken));
                    if (response.IsSuccessStatusCode)
                    {
                        return ParseListFromRaw<T>(raw ?? string.Empty, primaryArrayProperty);
                    }
                }

                // Try alternate base URLs with absolute requests
                foreach (var absoluteUrl in GetAlternateBaseUrls(relativePath))
                {
                    _logger?.LogInformation("Trying alternate SkuVault base URL: {Url}", absoluteUrl);
                        (response, raw) = await SendPostAbsoluteAsync(absoluteUrl, buildBody(userToken));
                    if (response.IsSuccessStatusCode)
                    {
                        return ParseListFromRaw<T>(raw ?? string.Empty, primaryArrayProperty);
                    }
                }
            }

            // If we get here, throw with as much detail as we can
            throw CreateHttpException(response, raw ?? string.Empty);
        }

        private async Task<List<T>> PostAndParseList<T>(string relativePath, object body, string primaryArrayProperty)
        {
            var (response, raw) = await SendPostAsync(relativePath, body);

            if (!response.IsSuccessStatusCode)
            {
                // Ability to retry handled at higher layer where we can rebuild body with fresh token
                // Try to surface SkuVault Errors array if present
                throw CreateHttpException(response, raw);
            }

            return ParseListFromRaw<T>(raw, primaryArrayProperty);
        }

        private async Task<(HttpResponseMessage Response, string Raw)> SendPostAsync(string relativePath, object body)
        {
            var response = await _httpClient.PostAsJsonAsync(relativePath, body);
            var raw = await response.Content.ReadAsStringAsync();
            return (response, raw);
        }

        private async Task<(HttpResponseMessage Response, string Raw)> SendPostAbsoluteAsync(string absoluteUrl, object body)
        {
            var response = await _httpClient.PostAsJsonAsync(absoluteUrl, body);
            var raw = await response.Content.ReadAsStringAsync();
            return (response, raw);
        }

        private List<T> ParseListFromRaw<T>(string raw, string primaryArrayProperty)
        {
            // Ensure raw is not null
            if (string.IsNullOrEmpty(raw))
            {
                _logger?.LogWarning("Received null or empty response for {Property}", primaryArrayProperty);
                return new List<T>();
            }

            // Log the raw response for debugging
            _logger?.LogInformation("Parsing response for {Property}. Raw response length: {Length}. First 500 chars: {Preview}", 
                primaryArrayProperty, raw.Length, Truncate(raw, 500));
            
            try
            {
                using var doc = JsonDocument.Parse(raw);
                
                // Log all root properties to see what we got
                var properties = string.Join(", ", doc.RootElement.EnumerateObject().Select(p => p.Name));
                _logger?.LogInformation("Response root properties: {Properties}", properties);
                
                if (doc.RootElement.TryGetProperty(primaryArrayProperty, out var arrayProp) && arrayProp.ValueKind == JsonValueKind.Array)
                {
                    var arrayLength = arrayProp.GetArrayLength();
                    _logger?.LogInformation("Found {Property} array with {Count} items", primaryArrayProperty, arrayLength);
                    
                    var list = new List<T>();
                    foreach (var item in arrayProp.EnumerateArray())
                    {
                        var model = item.Deserialize<T>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (model != null) list.Add(model);
                    }
                    _logger?.LogInformation("Successfully deserialized {Count} items of type {Type}", list.Count, typeof(T).Name);
                    return list;
                }
                else
                {
                    _logger?.LogWarning("Property {Property} not found or not an array. Root element kind: {Kind}", 
                        primaryArrayProperty, doc.RootElement.ValueKind);
                }
            }
            catch (JsonException ex)
            {
                _logger?.LogError(ex, "JSON parsing failed for {Property}", primaryArrayProperty);
                // fall through to direct deserialize attempts
            }

            // Try direct list or wrapped ApiResponse
            if (!string.IsNullOrEmpty(raw))
            {
                try
                {
                    var wrapped = JsonSerializer.Deserialize<ApiResponse<List<T>>>(raw, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (wrapped?.Data != null)
                    {
                        _logger?.LogInformation("Parsed wrapped ApiResponse with {Count} items of {Type}", wrapped.Data.Count, typeof(T).Name);
                        return wrapped.Data;
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Wrapped ApiResponse deserialization failed for {Type}", typeof(T).Name);
                }

                try
                {
                    var direct = JsonSerializer.Deserialize<List<T>>(raw, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (direct != null)
                    {
                        _logger?.LogInformation("Parsed direct list with {Count} items of {Type}", direct.Count, typeof(T).Name);
                        return direct;
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Direct list deserialization failed for {Type}. Raw (first 500): {Preview}", typeof(T).Name, Truncate(raw, 500));
                }
            }

            // If we reach here, response shape is unexpected
            throw new HttpRequestException($"Unexpected response shape for '{primaryArrayProperty}'. Raw: {Truncate(raw ?? string.Empty, 500)}");
        }

        private List<SkuVaultInventoryDto> ParseInventoryDictionary(string raw)
        {
            // SkuVault inventory endpoint returns: {"Items": {"SKU1": [{...}], "SKU2": [{...}]}}
            // We need to flatten this into a list
            var result = new List<SkuVaultInventoryDto>();
            
            if (string.IsNullOrEmpty(raw))
            {
                _logger?.LogWarning("Received null or empty inventory response");
                return result;
            }
            
            _logger?.LogInformation($"Parsing inventory dictionary. Raw length: {raw.Length}. First 500 chars: {Truncate(raw, 500)}");
            
            try
            {
                using var doc = JsonDocument.Parse(raw);
                
                if (!doc.RootElement.TryGetProperty("Items", out var itemsElement))
                {
                    _logger?.LogWarning("No 'Items' property found in inventory response");
                    throw new HttpRequestException($"Unexpected inventory response: no 'Items' property. Raw: {Truncate(raw, 500)}");
                }
                
                if (itemsElement.ValueKind != JsonValueKind.Object)
                {
                    _logger?.LogWarning($"'Items' is not an object, it's {itemsElement.ValueKind}");
                    throw new HttpRequestException($"Unexpected inventory response: 'Items' is not an object. Raw: {Truncate(raw, 500)}");
                }
                
                // Iterate through each SKU in the dictionary
                foreach (var skuProperty in itemsElement.EnumerateObject())
                {
                    var sku = skuProperty.Name;
                    var locations = skuProperty.Value;
                    
                    if (locations.ValueKind != JsonValueKind.Array)
                    {
                        _logger?.LogWarning($"SKU '{sku}' value is not an array");
                        continue;
                    }
                    
                    // Each SKU has an array of location objects
                    foreach (var locationElement in locations.EnumerateArray())
                    {
                        try
                        {
                            var warehouseCode = locationElement.TryGetProperty("WarehouseCode", out var wc) ? wc.GetString() : null;
                            var locationCode = locationElement.TryGetProperty("LocationCode", out var lc) ? lc.GetString() : null;
                            var quantity = locationElement.TryGetProperty("Quantity", out var q) ? q.GetInt32() : 0;
                            
                            result.Add(new SkuVaultInventoryDto
                            {
                                Sku = sku,
                                LocationCode = locationCode ?? string.Empty,
                                QuantityOnHand = quantity,
                                QuantityAvailable = quantity, // API doesn't distinguish, use same value
                                QuantityAllocated = 0 // Not provided by this endpoint
                            });
                        }
                        catch (Exception ex)
                        {
                            _logger?.LogWarning(ex, $"Failed to parse location data for SKU '{sku}'");
                        }
                    }
                }
                
                _logger?.LogInformation($"Parsed inventory dictionary with {result.Count} total location entries across {itemsElement.EnumerateObject().Count()} SKUs");
            }
            catch (JsonException ex)
            {
                _logger?.LogError(ex, "Failed to parse inventory response as JSON");
                throw new HttpRequestException($"Invalid JSON in inventory response. Raw: {Truncate(raw ?? string.Empty, 500)}");
            }
            
            return result;
        }

        private List<SkuVaultInventoryMovementDto> ParseTransactionsArray(string raw)
        {
            var result = new List<SkuVaultInventoryMovementDto>();
            
            if (string.IsNullOrEmpty(raw))
            {
                _logger?.LogWarning("Received null or empty transactions response");
                return result;
            }
            
            _logger?.LogInformation("Parsing transactions array. Raw length: {Length}. First 500: {Preview}", raw.Length, Truncate(raw, 500));

            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (!doc.RootElement.TryGetProperty("Transactions", out var txElement))
                {
                    _logger?.LogWarning("No 'Transactions' property present. Root kind: {Kind}", doc.RootElement.ValueKind);
                    throw new HttpRequestException($"Unexpected response shape for 'Transactions'. Raw: {Truncate(raw, 500)}");
                }

                if (txElement.ValueKind != JsonValueKind.Array)
                {
                    _logger?.LogWarning("'Transactions' property is not an array. Kind: {Kind}", txElement.ValueKind);
                    throw new HttpRequestException($"Unexpected response shape for 'Transactions'. Raw: {Truncate(raw ?? string.Empty, 500)}");
                }

                var count = txElement.GetArrayLength();
                _logger?.LogInformation("Transactions array contains {Count} items", count);

                foreach (var item in txElement.EnumerateArray())
                {
                    try
                    {
                        var movement = new SkuVaultInventoryMovementDto
                        {
                            Sku = GetStringProperty(item, "Sku") ?? string.Empty,
                            Location = GetStringProperty(item, "Location"),
                            Quantity = GetIntProperty(item, "Quantity"),
                            QuantityBefore = GetIntProperty(item, "QuantityBefore"),
                            QuantityAfter = GetIntProperty(item, "QuantityAfter"),
                            TransactionReason = GetStringProperty(item, "TransactionReason"),
                            TransactionNote = GetStringProperty(item, "TransactionNote"),
                            User = GetStringProperty(item, "User"),
                            TransactionType = GetStringProperty(item, "TransactionType"),
                            Context = GetStringProperty(item, "Context"),
                            TransactionDate = GetDateTimeProperty(item, "TransactionDate")
                        };
                        result.Add(movement);
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "Failed to parse a transaction item. Item JSON: {ItemJson}", 
                            item.GetRawText().Length > 500 ? item.GetRawText().Substring(0, 500) + "..." : item.GetRawText());
                    }
                }

                _logger?.LogInformation("Parsed {Count} transaction items successfully", result.Count);
            }
            catch (JsonException ex)
            {
                _logger?.LogError(ex, "JSON parse failed for transactions");
                throw new HttpRequestException($"Invalid JSON for 'Transactions'. Raw: {Truncate(raw ?? string.Empty, 500)}");
            }

            return result;
        }

        private Exception CreateHttpException(HttpResponseMessage response, string raw)
        {
            // Try to surface SkuVault Errors array if present
            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (doc.RootElement.TryGetProperty("Errors", out var errorsElement) && errorsElement.ValueKind == JsonValueKind.Array)
                {
                    var errors = errorsElement.EnumerateArray().Select(e => e.GetString()).Where(s => !string.IsNullOrEmpty(s));
                    var message = string.Join("; ", errors);
                    return new HttpRequestException($"{(int)response.StatusCode}: {message}");
                }
            }
            catch (JsonException)
            {
                // ignore parse errors, fall back to raw
            }
            return new HttpRequestException($"{(int)response.StatusCode}: {raw}");
        }

        private IEnumerable<string> GetAlternatePaths(string relativePath)
        {
            // Try capitalized path segments and a couple known alternates
            // products/getProducts => Products/GetProducts
            // locations/getLocations => Locations/GetLocations
            // inventory/getInventoryByLocation => Inventory/GetInventoryByLocation or inventory/getInventory
            // inventory/getTransactions => Inventory/GetTransactions
            var variants = new List<string>();

            string CapitalizeSegments(string path)
            {
                return string.Join('/', path.Split('/').Select(seg => string.IsNullOrEmpty(seg) ? seg : char.ToUpperInvariant(seg[0]) + seg.Substring(1)));
            }

            var capitalized = CapitalizeSegments(relativePath);
            if (!string.Equals(capitalized, relativePath, StringComparison.Ordinal))
            {
                variants.Add(capitalized);
            }

            if (relativePath.Equals("inventory/getInventoryByLocation", StringComparison.OrdinalIgnoreCase))
            {
                variants.Add("inventory/getInventory");
                variants.Add("Inventory/GetInventoryByLocation");
            }
            else if (relativePath.Equals("products/getProducts", StringComparison.OrdinalIgnoreCase))
            {
                variants.Add("Products/GetProducts");
            }
            else if (relativePath.Equals("locations/getLocations", StringComparison.OrdinalIgnoreCase))
            {
                variants.Add("Locations/GetLocations");
                variants.Add("getLocations");
                variants.Add("inventory/getLocations");
            }
            else if (relativePath.Equals("inventory/getTransactions", StringComparison.OrdinalIgnoreCase))
            {
                variants.Add("Inventory/GetTransactions");
            }

            return variants.Distinct(StringComparer.OrdinalIgnoreCase);
        }

        private IEnumerable<string> GetAlternateBaseUrls(string relativePath)
        {
            var bases = new List<string>();
            var baseAddr = _httpClient.BaseAddress?.ToString() ?? string.Empty;

            if (!string.IsNullOrEmpty(baseAddr))
            {
                // Ensure both with and without trailing slash
                var trimmed = baseAddr.TrimEnd('/');
                bases.Add(trimmed + "/" + relativePath);
                bases.Add(trimmed + "/api/" + relativePath);
                bases.Add(trimmed + "/v1/" + relativePath);

                // If already contains /api, also try without it
                if (trimmed.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
                {
                    var withoutApi = trimmed.Substring(0, trimmed.Length - 4);
                    bases.Add(withoutApi + "/" + relativePath);
                }
            }

            // Known public base
            bases.Add("https://app.skuvault.com/api/" + relativePath);
            bases.Add("https://app.skuvault.com/" + relativePath);

            return bases.Distinct(StringComparer.OrdinalIgnoreCase);
        }

        private void EnsureTenantToken(string tenantToken)
        {
            if (string.IsNullOrWhiteSpace(tenantToken))
            {
                throw new ArgumentException("Tenant token is required", nameof(tenantToken));
            }
        }

        private static string Truncate(string s, int max = 500)
        {
            if (string.IsNullOrEmpty(s)) return s;
            return s.Length <= max ? s : s.Substring(0, max) + "...";
        }

        private static string? GetStringProperty(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var prop))
                return null;

            return prop.ValueKind switch
            {
                JsonValueKind.String => prop.GetString(),
                JsonValueKind.Number => prop.GetDecimal().ToString(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => null,
                JsonValueKind.Undefined => null,
                _ => prop.GetRawText() // For objects/arrays, get the raw JSON
            };
        }

        private static int GetIntProperty(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var prop))
                return 0;

            return prop.ValueKind switch
            {
                JsonValueKind.Number => prop.GetInt32(),
                JsonValueKind.String when int.TryParse(prop.GetString(), out var intValue) => intValue,
                _ => 0
            };
        }

        private static DateTime GetDateTimeProperty(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var prop))
                return DateTime.UtcNow;

            return prop.ValueKind switch
            {
                JsonValueKind.String when DateTime.TryParse(prop.GetString(), out var dateValue) => dateValue,
                _ => DateTime.UtcNow
            };
        }

        private class ApiResponse<T>
        {
            public bool Success { get; set; }
            public T? Data { get; set; }
            public string? Message { get; set; }
        }
    }
}
