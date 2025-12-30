using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;
using System.Text.Json;

namespace SkuVaultSaaS.Tools
{
    public class MockDataGenerator
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MockDataGenerator> _logger;
        private readonly Random _random = new();
        
        // Realistic product categories and names
        private readonly string[] _categories = {
            "Electronics", "Apparel", "Home & Garden", "Sports & Outdoors", 
            "Health & Beauty", "Automotive", "Books", "Toys & Games",
            "Office Supplies", "Pet Supplies", "Kitchen & Dining", "Tools & Hardware"
        };

        private readonly Dictionary<string, string[]> _productsByCategory = new()
        {
            ["Electronics"] = new[] { "Wireless Headphones", "Smartphone Case", "USB Cable", "Power Bank", "Bluetooth Speaker", "Tablet Stand", "Screen Protector", "Charging Dock", "Webcam", "Keyboard" },
            ["Apparel"] = new[] { "Cotton T-Shirt", "Denim Jeans", "Running Shoes", "Baseball Cap", "Hoodie", "Dress Shirt", "Sneakers", "Winter Jacket", "Polo Shirt", "Cargo Pants" },
            ["Home & Garden"] = new[] { "Garden Hose", "Throw Pillow", "Picture Frame", "Candle Set", "Plant Pot", "Door Mat", "Wall Clock", "Lamp Shade", "Storage Basket", "Curtain Rod" },
            ["Sports & Outdoors"] = new[] { "Yoga Mat", "Water Bottle", "Camping Chair", "Hiking Backpack", "Tennis Racket", "Golf Balls", "Fitness Tracker", "Bicycle Helmet", "Sleeping Bag", "Cooler" },
            ["Health & Beauty"] = new[] { "Face Moisturizer", "Shampoo", "Vitamin C Serum", "Lip Balm", "Hand Cream", "Sunscreen", "Hair Brush", "Nail Polish", "Body Lotion", "Face Mask" },
            ["Automotive"] = new[] { "Car Phone Mount", "Tire Gauge", "Air Freshener", "Floor Mats", "Jumper Cables", "Car Charger", "Seat Covers", "Windshield Wipers", "Oil Filter", "Brake Pads" }
        };

        private readonly string[] _warehouses = { "Main Warehouse", "East Coast", "West Coast", "Midwest", "South" };
        private readonly string[] _carriers = { "UPS", "FedEx", "USPS", "DHL", "OnTrac" };
        private readonly string[] _channels = { "Amazon", "eBay", "Shopify", "Direct", "Walmart", "Etsy" };
        private readonly string[] _transactionTypes = { "Add", "Remove", "Pick", "Create" };
        
        // Realistic employee names for picker performance
        private readonly string[] _employeeNames = {
            "Sarah Johnson", "Mike Chen", "Alex Rodriguez", "Emily Davis", "James Wilson",
            "Maria Garcia", "David Kim", "Lisa Thompson", "Robert Martinez", "Jennifer Lee",
            "Michael Brown", "Ashley Taylor", "Christopher Anderson", "Amanda White", "Daniel Jackson",
            "Jessica Miller", "Kevin Moore", "Rachel Green", "Brandon Clark", "Stephanie Lewis"
        };

        public MockDataGenerator(ApplicationDbContext context, ILogger<MockDataGenerator> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task GenerateAllDataAsync(int customerId, MockDataOptions options)
        {
            _logger.LogInformation("Starting mock data generation for customer {CustomerId}", customerId);

            // Ensure customer exists
            var customer = await _context.Customers.FindAsync(customerId);
            if (customer == null)
            {
                throw new ArgumentException($"Customer with ID {customerId} not found");
            }

            // Clear existing data if requested
            if (options.ClearExistingData)
            {
                await ClearExistingDataAsync(customerId);
            }

            // Generate data in order (due to foreign key dependencies)
            await GenerateLocationsAsync(customerId, options.LocationCount);
            await GenerateProductsAsync(customerId, options.ProductCount);
            await GenerateInventoryLevelsAsync(customerId);
            await GenerateHistoricalDataAsync(customerId, options.HistoryDays);
            
            _logger.LogInformation("Mock data generation completed for customer {CustomerId}", customerId);
        }

        private async Task ClearExistingDataAsync(int customerId)
        {
            _logger.LogInformation("Clearing existing data for customer {CustomerId}", customerId);
            
            try
            {
                // Delete in reverse dependency order
                var txnCount = await _context.Transactions.Where(t => t.CustomerId == customerId).ExecuteDeleteAsync();
                _logger.LogInformation("Deleted {Count} transactions", txnCount);
                
                var movCount = await _context.InventoryMovements.Where(im => im.CustomerId == customerId).ExecuteDeleteAsync();
                _logger.LogInformation("Deleted {Count} inventory movements", movCount);
                
                var saleCount = await _context.Sales.Where(s => s.CustomerId == customerId).ExecuteDeleteAsync();
                _logger.LogInformation("Deleted {Count} sales", saleCount);
                
                var shipCount = await _context.Shipments.Where(s => s.CustomerId == customerId).ExecuteDeleteAsync();
                _logger.LogInformation("Deleted {Count} shipments", shipCount);
                
                var invCount = await _context.InventoryLevels.Where(il => il.CustomerId == customerId).ExecuteDeleteAsync();
                _logger.LogInformation("Deleted {Count} inventory levels", invCount);
                
                var prodCount = await _context.Products.Where(p => p.CustomerId == customerId).ExecuteDeleteAsync();
                _logger.LogInformation("Deleted {Count} products", prodCount);
                
                var locCount = await _context.Locations.Where(l => l.CustomerId == customerId).ExecuteDeleteAsync();
                _logger.LogInformation("Deleted {Count} locations", locCount);
                
                // Clear the context to remove any tracked entities from memory
                _context.ChangeTracker.Clear();
                
                _logger.LogInformation("Data cleared successfully for customer {CustomerId}", customerId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing data for customer {CustomerId}", customerId);
                throw;
            }
        }

        private async Task GenerateLocationsAsync(int customerId, int count)
        {
            _logger.LogInformation("Generating {Count} locations", count);
            
            var locations = new List<Location>();
            var binLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            
            foreach (var warehouse in _warehouses.Take(Math.Min(count / 10, _warehouses.Length)))
            {
                // Generate bins for each warehouse
                for (int i = 1; i <= Math.Min(20, count / _warehouses.Length); i++)
                {
                    var binLetter = binLetters[_random.Next(binLetters.Length)];
                    var binNumber = _random.Next(1, 100);
                    
                    locations.Add(new Location
                    {
                        CustomerId = customerId,
                        Code = $"{warehouse.Replace(" ", "")}-{binLetter}{binNumber:D2}",
                        Name = $"{warehouse} - Bin {binLetter}{binNumber:D2}",
                        Warehouse = warehouse,
                        IsActive = true,
                        CreatedAtUtc = DateTime.UtcNow.AddDays(-_random.Next(30, 365)),
                        UpdatedAtUtc = DateTime.UtcNow
                    });
                }
            }
            
            _context.Locations.AddRange(locations);
            await _context.SaveChangesAsync();
        }

        private async Task GenerateProductsAsync(int customerId, int count)
        {
            _logger.LogInformation("Generating {Count} products", count);
            
            var products = new List<Product>();
            var usedSkus = new HashSet<string>();
            
            for (int i = 0; i < count; i++)
            {
                var category = _categories[_random.Next(_categories.Length)];
                var productNames = _productsByCategory.ContainsKey(category) 
                    ? _productsByCategory[category] 
                    : new[] { "Generic Product" };
                
                var productName = productNames[_random.Next(productNames.Length)];
                
                // Generate unique SKU
                string sku;
                do
                {
                    var categoryCode = category.Substring(0, Math.Min(3, category.Length)).ToUpper();
                    var productCode = productName.Replace(" ", "").Substring(0, Math.Min(4, productName.Replace(" ", "").Length)).ToUpper();
                    var number = _random.Next(1000, 9999);
                    sku = $"{categoryCode}-{productCode}-{number}";
                } while (usedSkus.Contains(sku));
                
                usedSkus.Add(sku);
                
                // Generate realistic pricing
                var cost = (decimal)(_random.NextDouble() * 100 + 5); // $5-$105
                var markup = 1.5m + (decimal)(_random.NextDouble() * 2); // 1.5x to 3.5x markup
                var price = Math.Round(cost * markup, 2);
                
                products.Add(new Product
                {
                    CustomerId = customerId,
                    Sku = sku,
                    Name = $"{productName} - {GenerateVariant()}",
                    Description = $"High-quality {productName.ToLower()} perfect for everyday use",
                    Category = category,
                    Cost = cost,
                    Price = price,
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-_random.Next(30, 365)),
                    UpdatedAtUtc = DateTime.UtcNow
                });
            }
            
            _context.Products.AddRange(products);
            await _context.SaveChangesAsync();
        }

        private string GenerateVariant()
        {
            var colors = new[] { "Black", "White", "Blue", "Red", "Green", "Gray", "Navy", "Brown" };
            var sizes = new[] { "Small", "Medium", "Large", "XL", "One Size" };
            var materials = new[] { "Cotton", "Polyester", "Leather", "Plastic", "Metal", "Wood" };
            
            var variants = new List<string>();
            
            if (_random.NextDouble() < 0.7) variants.Add(colors[_random.Next(colors.Length)]);
            if (_random.NextDouble() < 0.4) variants.Add(sizes[_random.Next(sizes.Length)]);
            if (_random.NextDouble() < 0.3) variants.Add(materials[_random.Next(materials.Length)]);
            
            return variants.Count > 0 ? string.Join(" ", variants) : "Standard";
        }

        private async Task GenerateInventoryLevelsAsync(int customerId)
        {
            _logger.LogInformation("Generating inventory levels");
            
            var products = await _context.Products.Where(p => p.CustomerId == customerId).ToListAsync();
            var locations = await _context.Locations.Where(l => l.CustomerId == customerId).ToListAsync();
            
            var inventoryLevels = new List<InventoryLevel>();
            
            foreach (var product in products)
            {
                // Each product exists in 1-3 locations
                var productLocations = locations.OrderBy(x => _random.Next()).Take(_random.Next(1, 4));
                
                foreach (var location in productLocations)
                {
                    var quantityOnHand = GenerateRealisticQuantity(product.Category);
                    var quantityAllocated = Math.Min(quantityOnHand, _random.Next(0, quantityOnHand / 4));
                    var quantityAvailable = quantityOnHand - quantityAllocated;
                    
                    inventoryLevels.Add(new InventoryLevel
                    {
                        CustomerId = customerId,
                        ProductId = product.Id,
                        LocationId = location.Id,
                        QuantityOnHand = quantityOnHand,
                        QuantityAvailable = quantityAvailable,
                        QuantityAllocated = quantityAllocated,
                        UpdatedAtUtc = DateTime.UtcNow
                    });
                }
            }
            
            _context.InventoryLevels.AddRange(inventoryLevels);
            await _context.SaveChangesAsync();
        }

        private int GenerateRealisticQuantity(string? category)
        {
            // Different categories have different typical inventory levels
            return category switch
            {
                "Electronics" => _random.Next(5, 200),
                "Apparel" => _random.Next(10, 500),
                "Home & Garden" => _random.Next(3, 150),
                "Sports & Outdoors" => _random.Next(5, 300),
                "Health & Beauty" => _random.Next(20, 1000),
                "Automotive" => _random.Next(2, 100),
                _ => _random.Next(10, 250)
            };
        }

        private async Task GenerateHistoricalDataAsync(int customerId, int days)
        {
            _logger.LogInformation("Generating {Days} days of historical data", days);
            
            var products = await _context.Products.Where(p => p.CustomerId == customerId).ToListAsync();
            var locations = await _context.Locations.Where(l => l.CustomerId == customerId).ToListAsync();
            
            // Detach products and locations to avoid navigation issues
            foreach (var product in products)
                _context.Entry(product).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
            foreach (var location in locations)
                _context.Entry(location).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
            
            var startDate = DateTime.UtcNow.AddDays(-days);
            
            for (int day = 0; day < days; day++)
            {
                var currentDate = startDate.AddDays(day);
                var isWeekend = currentDate.DayOfWeek == DayOfWeek.Saturday || currentDate.DayOfWeek == DayOfWeek.Sunday;
                var isHoliday = IsHoliday(currentDate);
                
                // Generate daily activity (less on weekends/holidays)
                var activityMultiplier = isWeekend || isHoliday ? 0.3 : 1.0;
                var dailyTransactions = (int)((_random.Next(50, 200)) * activityMultiplier);
                
                await GenerateDailyTransactionsAsync(customerId, products, locations, currentDate, dailyTransactions);
                await GenerateDailySalesAsync(customerId, products, currentDate, dailyTransactions);
                await GenerateDailyShipmentsAsync(customerId, currentDate, dailyTransactions);
                
                // Save every day to avoid memory issues and context tracking conflicts
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }
            
            _logger.LogInformation("Historical data generation completed");
        }

        private async Task GenerateDailyTransactionsAsync(int customerId, List<Product> products, List<Location> locations, DateTime date, int count)
        {
            var transactions = new List<Transaction>();
            var movements = new List<InventoryMovement>();
            
            for (int i = 0; i < count; i++)
            {
                var product = products[_random.Next(products.Count)];
                var location = locations[_random.Next(locations.Count)];
                var transactionType = _transactionTypes[_random.Next(_transactionTypes.Length)];
                var employee = _employeeNames[_random.Next(_employeeNames.Length)];
                
                var quantity = transactionType switch
                {
                    "Pick" or "Remove" => -_random.Next(1, 10),
                    "Add" or "Create" => _random.Next(1, 50),
                    _ => _random.Next(-5, 5)
                };
                
                var transactionTime = date.AddHours(_random.Next(8, 18)).AddMinutes(_random.Next(0, 60));
                
                transactions.Add(new Transaction
                {
                    CustomerId = customerId,
                    SkuVaultId = $"TXN-{customerId}-{date:yyyyMMdd}-{i:D4}",
                    ProductId = product.Id,
                    LocationId = location.Id,
                    Sku = product.Sku,
                    Quantity = quantity,
                    QuantityBefore = _random.Next(0, 100),
                    QuantityAfter = Math.Max(0, _random.Next(0, 100) + quantity),
                    TransactionType = transactionType,
                    TransactionReason = GenerateTransactionReason(transactionType),
                    User = GenerateEmployeeEmail(employee),
                    PerformedBy = employee,
                    TransactionDate = transactionTime,
                    SyncedAtUtc = DateTime.UtcNow,
                    CreatedAtUtc = DateTime.UtcNow
                });
                
                movements.Add(new InventoryMovement
                {
                    CustomerId = customerId,
                    ProductId = product.Id,
                    LocationId = location.Id,
                    QuantityChange = quantity,
                    Reason = GenerateTransactionReason(transactionType),
                    Reference = GenerateReference(transactionType),
                    PerformedBy = employee,
                    TransactionType = transactionType,
                    OccurredAtUtc = transactionTime,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
            
            _context.Transactions.AddRange(transactions);
            _context.InventoryMovements.AddRange(movements);
        }
        
        private string EscapeSql(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            return value.Replace("'", "''");
        }

        private async Task GenerateDailySalesAsync(int customerId, List<Product> products, DateTime date, int baseCount)
        {
            // Generate 5-25 sales per day for better profitability data
            var salesCount = _random.Next(5, 26);
            var sales = new List<Sale>();
            
            // Pre-select popular products for this day to ensure good coverage
            var popularProducts = products.OrderBy(x => _random.Next()).Take(Math.Min(10, products.Count)).ToList();
            
            for (int i = 0; i < salesCount; i++)
            {
                // 70% chance to use a "popular" product, 30% random
                var product = _random.NextDouble() < 0.7 
                    ? popularProducts[_random.Next(popularProducts.Count)]
                    : products[_random.Next(products.Count)];
                
                var channel = _channels[_random.Next(_channels.Length)];
                // Realistic quantity distribution: most orders 1-3 units, some 4-8
                var quantity = _random.NextDouble() < 0.7 ? _random.Next(1, 4) : _random.Next(4, 9);
                var saleTime = date.AddHours(_random.Next(0, 24)).AddMinutes(_random.Next(0, 60));
                
                // Add slight price variation (±5% of base price) for realistic pricing
                var basePrice = product.Price ?? 0;
                var priceVariation = basePrice * (0.95m + (decimal)(_random.NextDouble() * 0.1));
                
                sales.Add(new Sale
                {
                    CustomerId = customerId,
                    SaleId = $"SALE-{date:yyyyMMdd}-{i:D4}",
                    Sku = product.Sku,
                    Quantity = quantity,
                    SaleDate = saleTime,
                    Channel = channel,
                    OrderNumber = $"ORD-{_random.Next(100000, 999999)}",
                    Price = priceVariation,
                    CustomerName = GenerateCustomerName(),
                    CustomerEmail = GenerateCustomerEmail()
                });
            }
            
            _context.Sales.AddRange(sales);
        }

        private async Task GenerateDailyShipmentsAsync(int customerId, DateTime date, int baseCount)
        {
            var shipmentCount = Math.Max(1, baseCount / 6); // Even fewer shipments
            var shipments = new List<Shipment>();
            
            for (int i = 0; i < shipmentCount; i++)
            {
                var carrier = _carriers[_random.Next(_carriers.Length)];
                var shipTime = date.AddHours(_random.Next(8, 17)).AddMinutes(_random.Next(0, 60));
                
                shipments.Add(new Shipment
                {
                    CustomerId = customerId,
                    ShipmentId = $"SHIP-{date:yyyyMMdd}-{i:D4}",
                    OrderId = $"ORD-{_random.Next(100000, 999999)}",
                    TrackingNumber = GenerateTrackingNumber(carrier),
                    Carrier = carrier,
                    Service = GenerateShippingService(carrier),
                    ShippedDate = shipTime,
                    CreatedDateUtc = DateTime.UtcNow,
                    UpdatedDateUtc = DateTime.UtcNow,
                    Status = "Shipped",
                    ShippingCost = (decimal)(_random.NextDouble() * 20 + 5),
                    RecipientName = GenerateCustomerName(),
                    RecipientAddress = GenerateAddress(),
                    RecipientCity = GenerateCity(),
                    RecipientState = GenerateState(),
                    RecipientZip = GenerateZipCode(),
                    RecipientCountry = "US"
                });
            }
            
            _context.Shipments.AddRange(shipments);
        }

        // Helper methods for generating realistic data
        private string GenerateTransactionReason(string transactionType) => transactionType switch
        {
            "Pick" => "Order fulfillment",
            "Remove" => "Inventory removal",
            "Add" => "Inventory addition", 
            "Create" => "Initial stock creation",
            _ => "Inventory adjustment"
        };

        private string GenerateReference(string transactionType) => transactionType switch
        {
            "Pick" => $"ORD-{_random.Next(100000, 999999)}",
            "Remove" => $"ADJ-{_random.Next(10000, 99999)}",
            "Add" => $"PO-{_random.Next(10000, 99999)}",
            "Create" => $"INV-{_random.Next(1000, 9999)}",
            _ => $"REF-{_random.Next(10000, 99999)}"
        };

        private string GenerateEmployeeEmail(string name) => 
            $"{name.Replace(" ", ".").ToLower()}@company.com";

        private string GenerateCustomerName()
        {
            var firstNames = new[] { "John", "Jane", "Mike", "Sarah", "David", "Lisa", "Chris", "Amy", "Tom", "Emma" };
            var lastNames = new[] { "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez" };
            return $"{firstNames[_random.Next(firstNames.Length)]} {lastNames[_random.Next(lastNames.Length)]}";
        }

        private string GenerateCustomerEmail()
        {
            var domains = new[] { "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "company.com" };
            var name = GenerateCustomerName().Replace(" ", ".").ToLower();
            return $"{name}@{domains[_random.Next(domains.Length)]}";
        }

        private string GenerateTrackingNumber(string carrier) => carrier switch
        {
            "UPS" => $"1Z{_random.Next(100000, 999999):D6}{_random.Next(10000000, 99999999):D8}",
            "FedEx" => $"{_random.Next(1000, 9999):D4} {_random.Next(1000, 9999):D4} {_random.Next(1000, 9999):D4}",
            "USPS" => $"9400 1000 0000 0000 0000 {_random.Next(10, 99):D2}",
            _ => $"TRK{_random.Next(100000000, 999999999):D9}"
        };

        private string GenerateShippingService(string carrier) => carrier switch
        {
            "UPS" => new[] { "Ground", "Next Day Air", "2nd Day Air" }[_random.Next(3)],
            "FedEx" => new[] { "Ground", "Express", "Priority Overnight" }[_random.Next(3)],
            "USPS" => new[] { "Priority Mail", "First-Class", "Express" }[_random.Next(3)],
            _ => "Standard"
        };

        private string GenerateAddress() => 
            $"{_random.Next(100, 9999)} {new[] { "Main St", "Oak Ave", "Park Rd", "First St", "Second Ave" }[_random.Next(5)]}";

        private string GenerateCity() => 
            new[] { "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose" }[_random.Next(10)];

        private string GenerateState() => 
            new[] { "CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI" }[_random.Next(10)];

        private string GenerateZipCode() => 
            $"{_random.Next(10000, 99999):D5}";

        private bool IsHoliday(DateTime date)
        {
            // Simple holiday detection (Christmas, New Year, etc.)
            return (date.Month == 12 && date.Day == 25) || 
                   (date.Month == 1 && date.Day == 1) ||
                   (date.Month == 7 && date.Day == 4) ||
                   (date.Month == 11 && date.Day >= 22 && date.Day <= 28 && date.DayOfWeek == DayOfWeek.Thursday); // Thanksgiving
        }
    }

    public class MockDataOptions
    {
        public int ProductCount { get; set; } = 1000;
        public int LocationCount { get; set; } = 50;
        public int HistoryDays { get; set; } = 90;
        public bool ClearExistingData { get; set; } = false;
    }
}