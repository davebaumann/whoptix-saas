using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Infrastructure.Data;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SeedController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SeedController> _logger;

        public SeedController(ApplicationDbContext context, ILogger<SeedController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("sample-data")]
        public async Task<IActionResult> CreateSampleData()
        {
            try
            {
                // Check if sample data already exists
                var existingProducts = await _context.Products.AnyAsync();
                if (existingProducts)
                {
                    return Ok(new { message = "Sample data already exists" });
                }

                // Get the first customer
                var customer = await _context.Customers.FirstAsync();
                if (customer == null)
                {
                    return BadRequest("No customer found. Please ensure database is seeded first.");
                }

                // Create sample locations
                var locations = new[]
                {
                    new Location { Code = "A1-01", Name = "Aisle 1, Shelf 1", Warehouse = "Main Warehouse", CustomerId = customer.Id },
                    new Location { Code = "A1-02", Name = "Aisle 1, Shelf 2", Warehouse = "Main Warehouse", CustomerId = customer.Id },
                    new Location { Code = "A2-01", Name = "Aisle 2, Shelf 1", Warehouse = "Secondary Warehouse", CustomerId = customer.Id },
                    new Location { Code = "RECEIVE", Name = "Receiving Area", Warehouse = "Main Warehouse", CustomerId = customer.Id },
                    new Location { Code = "SHIP", Name = "Shipping Area", Warehouse = "Main Warehouse", CustomerId = customer.Id }
                };

                _context.Locations.AddRange(locations);
                await _context.SaveChangesAsync();

                // Create sample products
                var products = new[]
                {
                    new Product { Sku = "WIDGET-001", Description = "Blue Widget", CustomerId = customer.Id },
                    new Product { Sku = "WIDGET-002", Description = "Red Widget", CustomerId = customer.Id },
                    new Product { Sku = "GADGET-001", Description = "Premium Gadget", CustomerId = customer.Id },
                    new Product { Sku = "TOOL-001", Description = "Multi-Tool", CustomerId = customer.Id },
                    new Product { Sku = "PART-001", Description = "Replacement Part A", CustomerId = customer.Id }
                };

                _context.Products.AddRange(products);
                await _context.SaveChangesAsync();

                // Create sample inventory levels
                var inventoryLevels = new[]
                {
                    new InventoryLevel { ProductId = products[0].Id, LocationId = locations[0].Id, CustomerId = customer.Id, QuantityOnHand = 100, QuantityAvailable = 100, QuantityAllocated = 0 },
                    new InventoryLevel { ProductId = products[1].Id, LocationId = locations[1].Id, CustomerId = customer.Id, QuantityOnHand = 75, QuantityAvailable = 75, QuantityAllocated = 0 },
                    new InventoryLevel { ProductId = products[2].Id, LocationId = locations[0].Id, CustomerId = customer.Id, QuantityOnHand = 50, QuantityAvailable = 50, QuantityAllocated = 0 },
                    new InventoryLevel { ProductId = products[3].Id, LocationId = locations[2].Id, CustomerId = customer.Id, QuantityOnHand = 25, QuantityAvailable = 25, QuantityAllocated = 0 },
                    new InventoryLevel { ProductId = products[4].Id, LocationId = locations[1].Id, CustomerId = customer.Id, QuantityOnHand = 200, QuantityAvailable = 200, QuantityAllocated = 0 }
                };

                _context.InventoryLevels.AddRange(inventoryLevels);
                await _context.SaveChangesAsync();

                // Create sample inventory movements (transactions)
                var baseTime = DateTime.UtcNow.Date; // Start of today
                var movements = new List<InventoryMovement>();

                // Receiving transactions (morning)
                movements.AddRange(new[]
                {
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[0].Id,
                        LocationId = locations[3].Id, // RECEIVE
                        QuantityChange = 50,
                        TransactionType = "Receive",
                        Reason = "Purchase Order #1001",
                        Reference = "PO-1001",
                        PerformedBy = "John Doe",
                        OccurredAtUtc = baseTime.AddHours(8).AddMinutes(30),
                        CreatedAtUtc = DateTime.UtcNow
                    },
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[1].Id,
                        LocationId = locations[3].Id,
                        QuantityChange = 25,
                        TransactionType = "Receive",
                        Reason = "Purchase Order #1002",
                        Reference = "PO-1002",
                        PerformedBy = "Jane Smith",
                        OccurredAtUtc = baseTime.AddHours(9).AddMinutes(15),
                        CreatedAtUtc = DateTime.UtcNow
                    }
                });

                // Put-away transactions (late morning)
                movements.AddRange(new[]
                {
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[0].Id,
                        LocationId = locations[0].Id, // A1-01
                        QuantityChange = 50,
                        TransactionType = "Put-away",
                        Reason = "Stock to shelf",
                        Reference = "PO-1001",
                        PerformedBy = "Mike Johnson",
                        OccurredAtUtc = baseTime.AddHours(10).AddMinutes(45),
                        CreatedAtUtc = DateTime.UtcNow
                    },
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[1].Id,
                        LocationId = locations[1].Id, // A1-02
                        QuantityChange = 25,
                        TransactionType = "Put-away",
                        Reason = "Stock to shelf",
                        Reference = "PO-1002",
                        PerformedBy = "Sarah Wilson",
                        OccurredAtUtc = baseTime.AddHours(11).AddMinutes(0),
                        CreatedAtUtc = DateTime.UtcNow
                    }
                });

                // Pick transactions (afternoon)
                movements.AddRange(new[]
                {
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[0].Id,
                        LocationId = locations[0].Id,
                        QuantityChange = -5,
                        TransactionType = "Pick",
                        Reason = "Sales Order",
                        Reference = "SO-2001",
                        PerformedBy = "Bob Anderson",
                        OccurredAtUtc = baseTime.AddHours(13).AddMinutes(20),
                        CreatedAtUtc = DateTime.UtcNow
                    },
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[1].Id,
                        LocationId = locations[1].Id,
                        QuantityChange = -3,
                        TransactionType = "Pick",
                        Reason = "Sales Order",
                        Reference = "SO-2002",
                        PerformedBy = "Alice Brown",
                        OccurredAtUtc = baseTime.AddHours(14).AddMinutes(10),
                        CreatedAtUtc = DateTime.UtcNow
                    },
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[2].Id,
                        LocationId = locations[0].Id,
                        QuantityChange = -2,
                        TransactionType = "Pick",
                        Reason = "Sales Order",
                        Reference = "SO-2003",
                        PerformedBy = "Charlie Davis",
                        OccurredAtUtc = baseTime.AddHours(15).AddMinutes(30),
                        CreatedAtUtc = DateTime.UtcNow
                    }
                });

                // Pack transactions (late afternoon)
                movements.AddRange(new[]
                {
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[0].Id,
                        LocationId = locations[4].Id, // SHIP
                        QuantityChange = -5,
                        TransactionType = "Pack",
                        Reason = "Package for shipping",
                        Reference = "SO-2001",
                        PerformedBy = "Diana Evans",
                        OccurredAtUtc = baseTime.AddHours(16).AddMinutes(0),
                        CreatedAtUtc = DateTime.UtcNow
                    },
                    new InventoryMovement
                    {
                        CustomerId = customer.Id,
                        ProductId = products[1].Id,
                        LocationId = locations[4].Id,
                        QuantityChange = -3,
                        TransactionType = "Pack",
                        Reason = "Package for shipping",
                        Reference = "SO-2002",
                        PerformedBy = "Frank Miller",
                        OccurredAtUtc = baseTime.AddHours(16).AddMinutes(15),
                        CreatedAtUtc = DateTime.UtcNow
                    }
                });

                _context.InventoryMovements.AddRange(movements);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully created sample data: {ProductCount} products, {LocationCount} locations, {MovementCount} movements",
                    products.Length, locations.Length, movements.Count);

                return Ok(new
                {
                    message = "Sample data created successfully",
                    products = products.Length,
                    locations = locations.Length,
                    movements = movements.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create sample data");
                return StatusCode(500, new { message = "Failed to create sample data", error = ex.Message });
            }
        }

        [HttpPost("fix-locations")]
        public async Task<IActionResult> FixLocationWarehouses()
        {
            try
            {
                var locations = await _context.Locations.ToListAsync();
                
                foreach (var location in locations)
                {
                    if (string.IsNullOrEmpty(location.Warehouse))
                    {
                        location.Warehouse = location.Code switch
                        {
                            "A1-01" or "A1-02" or "RECEIVE" or "SHIP" => "Main Warehouse",
                            "A2-01" => "Secondary Warehouse",
                            _ => "Main Warehouse"
                        };
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Location warehouses updated successfully",
                    updated = locations.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fix location warehouses");
                return StatusCode(500, new { message = "Failed to fix location warehouses", error = ex.Message });
            }
        }

        [HttpPost("historical-movements")]
        public async Task<IActionResult> CreateHistoricalMovements()
        {
            try
            {
                // Check if historical movements already exist
                var existingHistoricalMovements = await _context.InventoryMovements
                    .Where(im => im.OccurredAtUtc < DateTime.UtcNow.Date.AddDays(-1))
                    .AnyAsync();
                
                if (existingHistoricalMovements)
                {
                    return Ok(new { message = "Historical movement data already exists" });
                }

                var customer = await _context.Customers.FirstAsync();
                var products = await _context.Products.Where(p => p.CustomerId == customer.Id).ToListAsync();
                var locations = await _context.Locations.Where(l => l.CustomerId == customer.Id).ToListAsync();

                if (!products.Any() || !locations.Any())
                {
                    return BadRequest("No products or locations found. Please create sample data first.");
                }

                var historicalMovements = new List<InventoryMovement>();
                var random = new Random();

                // Create 60 days of historical data for performance report analysis
                for (int daysBack = 1; daysBack <= 60; daysBack++)
                {
                    var movementDate = DateTime.UtcNow.Date.AddDays(-daysBack);
                    
                    // Create 2-8 movements per day
                    var movementsPerDay = random.Next(2, 9);
                    
                    for (int i = 0; i < movementsPerDay; i++)
                    {
                        var product = products[random.Next(products.Count)];
                        var location = locations[random.Next(locations.Count)];
                        var hour = random.Next(8, 18); // Business hours 8 AM - 6 PM
                        var minute = random.Next(0, 60);
                        
                        // Mix of transaction types with realistic weights
                        var transactionTypes = new[] { "Pick", "Receive", "Put-away", "Adjust", "Transfer", "Sale" };
                        var transactionWeights = new[] { 30, 15, 15, 5, 10, 25 }; // Pick and Sale most common
                        var transactionType = GetWeightedRandomChoice(transactionTypes, transactionWeights, random);
                        
                        // Quantity based on transaction type
                        int quantity = transactionType switch
                        {
                            "Pick" or "Sale" => -random.Next(1, 11), // Outbound (negative)
                            "Receive" => random.Next(5, 51), // Inbound (positive)
                            "Put-away" => random.Next(1, 26), // Inbound (positive)
                            "Adjust" => random.Next(-5, 6), // Can be positive or negative
                            "Transfer" => -random.Next(1, 6), // Outbound from one location
                            _ => random.Next(1, 11)
                        };

                        historicalMovements.Add(new InventoryMovement
                        {
                            CustomerId = customer.Id,
                            ProductId = product.Id,
                            LocationId = location.Id,
                            QuantityChange = quantity,
                            TransactionType = transactionType,
                            Reason = GenerateReason(transactionType, random),
                            Reference = GenerateReference(transactionType, random, daysBack),
                            PerformedBy = GetRandomUser(random),
                            OccurredAtUtc = movementDate.AddHours(hour).AddMinutes(minute),
                            CreatedAtUtc = movementDate.AddHours(hour).AddMinutes(minute).AddMinutes(5)
                        });
                    }
                }

                _context.InventoryMovements.AddRange(historicalMovements);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Historical movement data created successfully!",
                    movementsCreated = historicalMovements.Count,
                    daysSpanned = 60
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating historical movement data");
                return StatusCode(500, $"Error creating historical movement data: {ex.Message}");
            }
        }

        private string GetWeightedRandomChoice(string[] choices, int[] weights, Random random)
        {
            var totalWeight = weights.Sum();
            var randomValue = random.Next(totalWeight);
            var currentWeight = 0;
            
            for (int i = 0; i < choices.Length; i++)
            {
                currentWeight += weights[i];
                if (randomValue < currentWeight)
                    return choices[i];
            }
            
            return choices[^1]; // Fallback to last choice
        }

        private string GenerateReason(string transactionType, Random random)
        {
            return transactionType switch
            {
                "Pick" => $"Order fulfillment #{random.Next(1000, 9999)}",
                "Sale" => $"Direct sale #{random.Next(100, 999)}",
                "Receive" => $"Purchase order #{random.Next(1000, 9999)}",
                "Put-away" => "Stock replenishment",
                "Adjust" => "Inventory adjustment",
                "Transfer" => "Location transfer",
                _ => "Standard operation"
            };
        }

        private string GenerateReference(string transactionType, Random random, int daysBack)
        {
            var dateRef = DateTime.UtcNow.Date.AddDays(-daysBack).ToString("MMdd");
            return transactionType switch
            {
                "Pick" or "Sale" => $"ORD-{dateRef}-{random.Next(100, 999)}",
                "Receive" => $"PO-{dateRef}-{random.Next(1000, 9999)}",
                "Transfer" => $"TRF-{dateRef}-{random.Next(100, 999)}",
                "Adjust" => $"ADJ-{dateRef}-{random.Next(100, 999)}",
                _ => $"REF-{dateRef}-{random.Next(100, 999)}"
            };
        }

        private string GetRandomUser(Random random)
        {
            var users = new[] { "John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson", "Bob Davis", "Alice Brown", "Tom Wilson", "Lisa Garcia" };
            return users[random.Next(users.Length)];
        }
    }
}