using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SkuVaultSaaS.Infrastructure.Data
{
    public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            
            // Use a placeholder connection string for migrations
            optionsBuilder.UseMySql("Server=localhost;Database=placeholder;User=root;Password=placeholder;",
                new MySqlServerVersion(new Version(8, 0, 21)));

            return new ApplicationDbContext(optionsBuilder.Options);
        }
    }
}