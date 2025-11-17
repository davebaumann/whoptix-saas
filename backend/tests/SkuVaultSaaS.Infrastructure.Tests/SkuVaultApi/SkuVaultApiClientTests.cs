using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using System.Threading;
using Xunit;
using SkuVaultSaaS.Infrastructure.SkuVaultSaaSApi;

namespace SkuVaultSaaS.Infrastructure.Tests.SkuVaultApi
{
    public class SkuVaultApiClientTests
    {
        private readonly Mock<HttpMessageHandler> _mockHttpHandler;
        private readonly HttpClient _httpClient;
        private readonly IOptions<SkuVaultApiOptions> _options;
        private readonly SkuVaultApiClient _client;

        public SkuVaultApiClientTests()
        {
            _mockHttpHandler = new Mock<HttpMessageHandler>();
            _httpClient = new HttpClient(_mockHttpHandler.Object);
            _options = Options.Create(new SkuVaultApiOptions
            {
                BaseUrl = "https://api.skuvault.com/",
                ClientId = "test-client-id",
                ClientSecret = "test-client-secret"
            });

            _client = new SkuVaultApiClient(_httpClient, _options);
        }

        [Fact]
        public async Task GetCustomersForTenantAsync_WithValidToken_ReturnsCustomers()
        {
            // Arrange
            var response = @"{
                ""success"": true,
                ""data"": [
                    {
                        ""id"": ""cust1"",
                        ""name"": ""Test Customer 1"",
                        ""email"": ""test1@example.com""
                    }
                ]
            }";

            _mockHttpHandler
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(response)
                });

            // Act
            var result = await _client.GetCustomersForTenantAsync("test-token");

            // Assert
            Assert.NotNull(result);
            Assert.Single(result);
            Assert.Equal("cust1", result[0].Id);
            Assert.Equal("Test Customer 1", result[0].Name);
            Assert.Equal("test1@example.com", result[0].Email);

            // Verify the request
            _mockHttpHandler
                .Protected()
                .Verify(
                    "SendAsync",
                    Times.Once(),
                    ItExpr.Is<HttpRequestMessage>(req => 
                        req.Headers.Authorization != null &&
                        req.Headers.Authorization.Parameter == "test-token" &&
                        req.Method == HttpMethod.Get),
                    ItExpr.IsAny<CancellationToken>()
                );
        }

        [Fact]
        public async Task GetCustomersForTenantAsync_WithInvalidToken_ThrowsException()
        {
            // Arrange
            _mockHttpHandler
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.Unauthorized,
                    Content = new StringContent(@"{""message"": ""Invalid token""}")
                });

            // Act & Assert
            var exception = await Assert.ThrowsAsync<HttpRequestException>(
                () => _client.GetCustomersForTenantAsync("invalid-token")
            );
            Assert.Contains("401", exception.Message);
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        public async Task GetCustomersForTenantAsync_WithEmptyToken_ThrowsArgumentException(string token)
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(
                () => _client.GetCustomersForTenantAsync(token)
            );
        }
    }
}