using Microsoft.Extensions.Configuration;
using System.Security.Claims;

namespace SkuVaultSaaS.Infrastructure.Services
{
    public interface IDemoConnectionService
    {
        string GetConnectionString(ClaimsPrincipal user);
    }

    public class DemoConnectionService : IDemoConnectionService
    {
        private readonly string _demoConnectionString;

        /// <summary>
        /// Constructor for dependency injection with substituted demo connection string
        /// </summary>
        public DemoConnectionService(string demoConnectionString)
        {
            _demoConnectionString = demoConnectionString;
        }

        /// <summary>
        /// Returns the demo database connection string
        /// This service is only used by DemoReportsController for anonymous demo access
        /// </summary>
        public string GetConnectionString(ClaimsPrincipal user)
        {
            if (string.IsNullOrEmpty(_demoConnectionString))
            {
                throw new InvalidOperationException("Demo connection string not provided.");
            }

            return _demoConnectionString;
        }
    }
}
