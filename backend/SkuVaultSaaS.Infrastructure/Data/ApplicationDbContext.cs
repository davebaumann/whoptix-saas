using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Core.Models;

namespace SkuVaultSaaS.Infrastructure.Data
{
    public class ApplicationDbContext : IdentityDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        public DbSet<Tenant> Tenants => Set<Tenant>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<Location> Locations => Set<Location>();
        public DbSet<InventoryLevel> InventoryLevels => Set<InventoryLevel>();
        public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
        public DbSet<Transaction> Transactions => Set<Transaction>();
        public DbSet<LowStockThreshold> LowStockThresholds => Set<LowStockThreshold>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Tenant>()
                .HasMany(t => t.Customers)
                .WithOne(c => c.Tenant)
                .HasForeignKey(c => c.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Customer>()
                .HasIndex(c => c.ExternalId)
                .IsUnique();

            // Product configuration
            builder.Entity<Product>()
                .HasIndex(p => new { p.CustomerId, p.Sku })
                .IsUnique();
            builder.Entity<Product>()
                .Property(p => p.Cost)
                .HasColumnType("decimal(18,2)");
            builder.Entity<Product>()
                .Property(p => p.Price)
                .HasColumnType("decimal(18,2)");
            builder.Entity<Product>()
                .Property(p => p.Sku)
                .HasMaxLength(128);

            // Location configuration
            builder.Entity<Location>()
                .HasIndex(l => new { l.CustomerId, l.Code })
                .IsUnique();
            builder.Entity<Location>()
                .Property(l => l.Code)
                .HasMaxLength(128);

            // InventoryLevel configuration
            builder.Entity<InventoryLevel>()
                .HasIndex(il => new { il.CustomerId, il.ProductId, il.LocationId })
                .IsUnique();

            // Relationships
            builder.Entity<Product>()
                .HasOne(p => p.Customer)
                .WithMany()
                .HasForeignKey(p => p.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Location>()
                .HasOne(l => l.Customer)
                .WithMany()
                .HasForeignKey(l => l.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<InventoryLevel>()
                .HasOne(il => il.Customer)
                .WithMany()
                .HasForeignKey(il => il.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<InventoryLevel>()
                .HasOne(il => il.Product)
                .WithMany(p => p.InventoryLevels)
                .HasForeignKey(il => il.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<InventoryLevel>()
                .HasOne(il => il.Location)
                .WithMany(l => l.InventoryLevels)
                .HasForeignKey(il => il.LocationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<InventoryMovement>()
                .HasOne(m => m.Customer)
                .WithMany()
                .HasForeignKey(m => m.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<InventoryMovement>()
                .HasOne(m => m.Product)
                .WithMany(p => p.Movements)
                .HasForeignKey(m => m.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<InventoryMovement>()
                .HasOne(m => m.Location)
                .WithMany()
                .HasForeignKey(m => m.LocationId)
                .OnDelete(DeleteBehavior.SetNull);

            // Transaction entity configuration
            builder.Entity<Transaction>()
                .HasIndex(t => t.SkuVaultId)
                .IsUnique();

            // LowStockThreshold configuration
            builder.Entity<LowStockThreshold>()
                .HasIndex(lst => new { lst.CustomerId, lst.ProductId, lst.LocationId })
                .IsUnique();

            builder.Entity<LowStockThreshold>()
                .HasOne(lst => lst.Customer)
                .WithMany()
                .HasForeignKey(lst => lst.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<LowStockThreshold>()
                .HasOne(lst => lst.Product)
                .WithMany()
                .HasForeignKey(lst => lst.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<LowStockThreshold>()
                .HasOne(lst => lst.Location)
                .WithMany()
                .HasForeignKey(lst => lst.LocationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
