using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Tools;
using System.CommandLine;

var rootCommand = new RootCommand("SkuVault SaaS Tools - Mock Data Generator");

var generateCommand = new Command("generate", "Generate mock data for development/testing");
var customerIdOption = new Option<int>("--customer-id", "Customer ID to generate data for") { IsRequired = true };
var productCountOption = new Option<int>("--products", () => 1000, "Number of products to generate");
var locationCountOption = new Option<int>("--locations", () => 50, "Number of locations to generate");
var historyDaysOption = new Option<int>("--history-days", () => 90, "Number of days of historical data");
var clearDataOption = new Option<bool>("--clear", () => false, "Clear existing data before generating");
var connectionStringOption = new Option<string>("--connection-string", "Database connection string (optional - uses appsettings if not provided)");

generateCommand.AddOption(customerIdOption);
generateCommand.AddOption(productCountOption);
generateCommand.AddOption(locationCountOption);
generateCommand.AddOption(historyDaysOption);
generateCommand.AddOption(clearDataOption);
generateCommand.AddOption(connectionStringOption);

generateCommand.SetHandler(async (int customerId, int products, int locations, int historyDays, bool clear, string? connectionString) =>
{
    try
    {
        var host = CreateHost(connectionString);
        using var scope = host.Services.CreateScope();
        
        var generator = scope.ServiceProvider.GetRequiredService<MockDataGenerator>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        
        logger.LogInformation("Starting mock data generation...");
        logger.LogInformation("Customer ID: {CustomerId}", customerId);
        logger.LogInformation("Products: {Products}", products);
        logger.LogInformation("Locations: {Locations}", locations);
        logger.LogInformation("History Days: {HistoryDays}", historyDays);
        logger.LogInformation("Clear Existing: {Clear}", clear);
        
        var options = new MockDataOptions
        {
            ProductCount = products,
            LocationCount = locations,
            HistoryDays = historyDays,
            ClearExistingData = clear
        };
        
        var startTime = DateTime.Now;
        await generator.GenerateAllDataAsync(customerId, options);
        var duration = DateTime.Now - startTime;
        
        logger.LogInformation("Mock data generation completed in {Duration}", duration);
        Console.WriteLine($"✅ Successfully generated mock data for customer {customerId} in {duration:mm\\:ss}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error: {ex.Message}");
        Environment.Exit(1);
    }
}, customerIdOption, productCountOption, locationCountOption, historyDaysOption, clearDataOption, connectionStringOption);

var listCustomersCommand = new Command("list-customers", "List available customers");
listCustomersCommand.AddOption(connectionStringOption);

listCustomersCommand.SetHandler(async (string? connectionString) =>
{
    try
    {
        var host = CreateHost(connectionString);
        using var scope = host.Services.CreateScope();
        
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var customers = await context.Customers.ToListAsync();
        
        Console.WriteLine("Available Customers:");
        Console.WriteLine("ID\tName\t\t\tEmail");
        Console.WriteLine("--\t----\t\t\t-----");
        
        foreach (var customer in customers)
        {
            Console.WriteLine($"{customer.Id}\t{customer.Name?.PadRight(20) ?? "N/A".PadRight(20)}\t{customer.Email}");
        }
        
        if (!customers.Any())
        {
            Console.WriteLine("No customers found. Create a customer first.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error: {ex.Message}");
        Environment.Exit(1);
    }
}, connectionStringOption);

var statsCommand = new Command("stats", "Show data statistics for a customer");
statsCommand.AddOption(customerIdOption);
statsCommand.AddOption(connectionStringOption);

statsCommand.SetHandler(async (int customerId, string? connectionString) =>
{
    try
    {
        var host = CreateHost(connectionString);
        using var scope = host.Services.CreateScope();
        
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var productCount = await context.Products.CountAsync(p => p.CustomerId == customerId);
        var locationCount = await context.Locations.CountAsync(l => l.CustomerId == customerId);
        var inventoryCount = await context.InventoryLevels.CountAsync(il => il.CustomerId == customerId);
        var transactionCount = await context.Transactions.CountAsync(t => t.CustomerId == customerId);
        var salesCount = await context.Sales.CountAsync(s => s.CustomerId == customerId);
        var shipmentCount = await context.Shipments.CountAsync(s => s.CustomerId == customerId);
        
        var oldestTransaction = await context.Transactions
            .Where(t => t.CustomerId == customerId)
            .OrderBy(t => t.TransactionDate)
            .Select(t => t.TransactionDate)
            .FirstOrDefaultAsync();
            
        var newestTransaction = await context.Transactions
            .Where(t => t.CustomerId == customerId)
            .OrderByDescending(t => t.TransactionDate)
            .Select(t => t.TransactionDate)
            .FirstOrDefaultAsync();
        
        Console.WriteLine($"📊 Data Statistics for Customer {customerId}");
        Console.WriteLine("=" + new string('=', 40));
        Console.WriteLine($"Products:      {productCount:N0}");
        Console.WriteLine($"Locations:     {locationCount:N0}");
        Console.WriteLine($"Inventory:     {inventoryCount:N0}");
        Console.WriteLine($"Transactions:  {transactionCount:N0}");
        Console.WriteLine($"Sales:         {salesCount:N0}");
        Console.WriteLine($"Shipments:     {shipmentCount:N0}");
        
        if (oldestTransaction != default && newestTransaction != default)
        {
            var daySpan = (newestTransaction - oldestTransaction).Days;
            Console.WriteLine($"Date Range:    {oldestTransaction:yyyy-MM-dd} to {newestTransaction:yyyy-MM-dd} ({daySpan} days)");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error: {ex.Message}");
        Environment.Exit(1);
    }
}, customerIdOption, connectionStringOption);

rootCommand.AddCommand(generateCommand);
rootCommand.AddCommand(listCustomersCommand);
rootCommand.AddCommand(statsCommand);

return await rootCommand.InvokeAsync(args);

static IHost CreateHost(string? connectionString)
{
    var builder = Host.CreateDefaultBuilder()
        .ConfigureServices((context, services) =>
        {
            var config = context.Configuration;
            
            // Use provided connection string or get from config
            var connStr = connectionString ?? config.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connStr))
            {
                throw new InvalidOperationException("No connection string provided. Use --connection-string or configure in appsettings.json");
            }
            
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseMySql(connStr, ServerVersion.AutoDetect(connStr))
                       .EnableSensitiveDataLogging(false)
                       .LogTo(Console.WriteLine, LogLevel.Warning));
            
            services.AddScoped<MockDataGenerator>();
            services.AddLogging(builder => 
                builder.AddConsole()
                       .SetMinimumLevel(LogLevel.Information)
                       .AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning));
        });
    
    return builder.Build();
}