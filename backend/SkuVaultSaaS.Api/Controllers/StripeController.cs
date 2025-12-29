using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using SkuVaultSaaS.Infrastructure.Data;
using SkuVaultSaaS.Core.Models;
using SkuVaultSaaS.Core.Enums;
using Stripe;
using Stripe.Checkout;

namespace SkuVaultSaaS.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StripeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StripeController> _logger;
        private readonly IConfiguration _configuration;
        private readonly UserManager<ApplicationUser> _userManager;

        public StripeController(
            ApplicationDbContext context,
            ILogger<StripeController> logger,
            IConfiguration configuration,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _userManager = userManager;

            // Initialize Stripe
            StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];
        }

        [HttpPost("create-payment-intent")]
        public async Task<IActionResult> CreatePaymentIntent([FromBody] CreatePaymentIntentRequest request)
        {
            try
            {
                _logger.LogInformation("CreatePaymentIntent called for email: {Email}, priceId: {PriceId}", request.Email, request.PriceId);

                // Get the authenticated user
                var userEmail = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value ??
                               User.FindFirst(JwtRegisteredClaimNames.Email)?.Value ??
                               User.FindFirst("email")?.Value;

                if (string.IsNullOrEmpty(userEmail))
                {
                    _logger.LogWarning("Could not extract user email from JWT claims");
                    return Unauthorized("User email not found in claims");
                }

                // Get the current authenticated user's ID from JWT
                var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
                            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                            User.FindFirst("sub")?.Value;
                
                var appUser = !string.IsNullOrEmpty(userId) 
                    ? await _userManager.FindByIdAsync(userId) 
                    : null;

                // Look for an existing customer linked to this ApplicationUser
                var customer = appUser?.CustomerId != null 
                    ? await _context.Customers.FirstOrDefaultAsync(c => c.Id == appUser.CustomerId)
                    : null;

                // If no customer linked to user, create a new one (don't reuse old seeded ones)
                if (customer == null)
                {
                    _logger.LogWarning("No customer linked to user {UserId} with email {Email}, creating new one", userId, request.Email);
                    
                    // Create a new tenant for this customer
                    var tenant = new Tenant 
                    { 
                        Name = request.Email?.Trim() ?? "Unknown"
                    };
                    _context.Tenants.Add(tenant);
                    await _context.SaveChangesAsync();

                    // Create a new customer
                    customer = new Core.Models.Customer
                    {
                        Name = request.Email?.Trim() ?? "Unknown",
                        Email = (request.Email?.ToLower().Trim()) ?? "unknown@example.com",
                        ExternalId = Guid.NewGuid().ToString(),
                        TenantId = tenant.Id,
                        MembershipLevel = MembershipLevel.Basic,
                        IsActive = true,
                        LastSyncedAt = DateTime.UtcNow
                    };
                    _context.Customers.Add(customer);
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation("Created new customer {CustomerId} and tenant {TenantId} for user {UserId}", customer.Id, tenant.Id, userId);
                }

                // Ensure the ApplicationUser is linked to this customer
                if (appUser != null && appUser.CustomerId != customer.Id)
                {
                    appUser.CustomerId = customer.Id;
                    appUser.CustomerRole = CustomerRole.Owner;
                    await _userManager.UpdateAsync(appUser);
                    _logger.LogInformation("Linked ApplicationUser {UserId} to customer {CustomerId}", userId, customer.Id);
                }

                _logger.LogInformation("Using customer {CustomerId} for user {UserId} with email {Email}", customer.Id, userId, request.Email);

                // Get price amount based on priceId (you'll need to configure these)
                _logger.LogInformation("Looking up price amount for priceId: {PriceId}", request.PriceId);
                
                // Log all configured price IDs for debugging
                var priceIdsSection = _configuration.GetSection("Stripe:PriceIds");
                _logger.LogInformation("Configured PriceIds: standard_monthly={Standard}, premium_monthly={Premium}, enterprise_monthly={Enterprise}",
                    priceIdsSection["standard_monthly"],
                    priceIdsSection["premium_monthly"],
                    priceIdsSection["enterprise_monthly"]);
                
                var priceAmount = GetPriceAmount(request.PriceId);
                _logger.LogInformation("GetPriceAmount returned: {PriceAmount}", priceAmount);
                
                if (priceAmount == 0)
                {
                    _logger.LogError("Invalid price ID: {PriceId} not found in configuration", request.PriceId);
                    return BadRequest($"Invalid price ID: {request.PriceId} not found in configuration");
                }

                // Create or retrieve Stripe customer
                var stripeCustomerService = new CustomerService();
                
                string stripeCustomerId;
                // If this customer already has a Stripe ID, reuse it
                if (!string.IsNullOrEmpty(customer.StripeCustomerId))
                {
                    stripeCustomerId = customer.StripeCustomerId;
                    _logger.LogInformation("Using existing Stripe customer {StripeCustomerId} for internal customer {CustomerId}", stripeCustomerId, customer.Id);
                }
                else
                {
                    // Create a NEW Stripe customer for this internal customer (never reuse by email)
                    var createOptions = new CustomerCreateOptions
                    {
                        Email = request.Email,
                        Name = customer.Name,
                        Metadata = new Dictionary<string, string>
                        {
                            { "customer_id", customer.Id.ToString() }
                        }
                    };
                    var stripeCustomer = await stripeCustomerService.CreateAsync(createOptions);
                    stripeCustomerId = stripeCustomer.Id;
                    customer.StripeCustomerId = stripeCustomerId;
                    _context.Customers.Update(customer);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Created NEW Stripe customer {StripeCustomerId} for internal customer {CustomerId}", stripeCustomerId, customer.Id);
                }

                // Ensure the Stripe customer ID is always saved
                if (customer.StripeCustomerId != stripeCustomerId)
                {
                    customer.StripeCustomerId = stripeCustomerId;
                    _context.Customers.Update(customer);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Saved StripeCustomerId {StripeCustomerId} for customer {CustomerId}", stripeCustomerId, customer.Id);
                }

                // Create the payment intent
                var paymentIntentService = new PaymentIntentService();
                var paymentIntentOptions = new PaymentIntentCreateOptions
                {
                    Amount = priceAmount * 100, // Amount in cents
                    Currency = "usd",
                    Customer = stripeCustomerId,
                    Metadata = new Dictionary<string, string>
                    {
                        { "customer_id", customer.Id.ToString() },
                        { "price_id", request.PriceId }
                    },
                    SetupFutureUsage = "off_session" // For recurring payments
                };

                var paymentIntent = await paymentIntentService.CreateAsync(paymentIntentOptions);

                return Ok(new
                {
                    clientSecret = paymentIntent.ClientSecret,
                    customerId = stripeCustomerId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment intent for customer {Email}", request.Email);
                return StatusCode(500, "Error creating payment intent");
            }
        }

        [HttpGet("receipts")]
        [Authorize]
        public async Task<IActionResult> GetReceipts()
        {
            try
            {
                // Get the current user's customer ID
                var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
                            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                            User.FindFirst("sub")?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("User not authenticated");
                }

                var appUser = await _userManager.FindByIdAsync(userId);
                if (appUser?.CustomerId == null)
                {
                    return BadRequest("No customer account found");
                }

                // Get the customer to find their Stripe customer ID
                var customer = await _context.Customers.FindAsync(appUser.CustomerId);
                if (customer == null)
                {
                    return NotFound("Customer not found");
                }

                // If customer has no Stripe ID, they have no receipts
                if (string.IsNullOrEmpty(customer.StripeCustomerId))
                {
                    _logger.LogInformation("Customer {CustomerId} has no Stripe customer ID, returning empty receipts", customer.Id);
                    return Ok(new List<object>());
                }

                // Query Stripe for charges for this customer
                var chargeService = new ChargeService();
                var charges = await chargeService.ListAsync(new ChargeListOptions
                {
                    Customer = customer.StripeCustomerId,
                    Limit = 100
                });

                var receipts = charges.Data
                    .Where(c => c.Paid && c.ReceiptUrl != null)
                    .OrderByDescending(c => c.Created)
                    .Select(c => new
                    {
                        c.Id,
                        Amount = c.Amount / 100m, // Convert cents to dollars
                        Currency = c.Currency?.ToUpper(),
                        Date = c.Created,
                        Status = c.Status,
                        ReceiptUrl = c.ReceiptUrl,
                        Description = c.Description
                    })
                    .ToList();

                _logger.LogInformation("Retrieved {Count} receipts for customer {CustomerId}", receipts.Count, customer.Id);

                return Ok(receipts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving receipts");
                return StatusCode(500, new { message = "Error retrieving receipts" });
            }
        }

        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> HandleWebhook()
        {
            _logger.LogInformation("=== STRIPE WEBHOOK RECEIVED ===");
            
            try
            {
                var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
                _logger.LogInformation("Webhook body length: {Length}", json.Length);
                
                var endpointSecret = _configuration["Stripe:WebhookSecret"];

                var stripeEvent = EventUtility.ConstructEvent(
                    json,
                    Request.Headers["Stripe-Signature"],
                    endpointSecret
                );

                _logger.LogInformation("=== STRIPE EVENT RECEIVED: {EventType} ===", stripeEvent.Type);

                switch (stripeEvent.Type)
                {
                    case "payment_intent.succeeded":
                        var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
                        if (paymentIntent != null)
                        {
                            await HandlePaymentSuccess(paymentIntent);
                        }
                        break;

                    case "customer.subscription.created":
                        var subscription = stripeEvent.Data.Object as Subscription;
                        if (subscription != null)
                        {
                            await HandleSubscriptionCreated(subscription);
                        }
                        break;

                    case "customer.subscription.updated":
                        var updatedSubscription = stripeEvent.Data.Object as Subscription;
                        if (updatedSubscription != null)
                        {
                            await HandleSubscriptionUpdated(updatedSubscription);
                        }
                        break;

                    case "customer.subscription.deleted":
                        var deletedSubscription = stripeEvent.Data.Object as Subscription;
                        if (deletedSubscription != null)
                        {
                            await HandleSubscriptionCanceled(deletedSubscription);
                        }
                        break;

                    case "invoice.paid":
                        var paidInvoice = stripeEvent.Data.Object as Invoice;
                        if (paidInvoice != null)
                        {
                            await HandleInvoicePaid(paidInvoice);
                        }
                        break;

                    case "invoice.payment_failed":
                        var failedInvoice = stripeEvent.Data.Object as Invoice;
                        if (failedInvoice != null)
                        {
                            await HandleInvoicePaymentFailed(failedInvoice);
                        }
                        break;

                    default:
                        _logger.LogWarning("Unhandled Stripe webhook event type: {EventType}", stripeEvent.Type);
                        break;
                }

                return Ok();
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Stripe exception handling webhook");
                return BadRequest();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling Stripe webhook");
                return BadRequest();
            }
        }

        private async Task HandlePaymentSuccess(PaymentIntent paymentIntent)
        {
            var customerIdStr = paymentIntent.Metadata.GetValueOrDefault("customer_id");
            var priceId = paymentIntent.Metadata.GetValueOrDefault("price_id");

            _logger.LogInformation("HandlePaymentSuccess: PaymentIntentId={PaymentIntentId}, CustomerId={CustomerId}, PriceId={PriceId}, MetadataCount={Count}", 
                paymentIntent.Id, customerIdStr, priceId, paymentIntent.Metadata?.Count ?? 0);
            
            if (paymentIntent.Metadata != null)
            {
                foreach (var kvp in paymentIntent.Metadata)
                {
                    _logger.LogInformation("  Metadata[{Key}]={Value}", kvp.Key, kvp.Value);
                }
            }

            if (int.TryParse(customerIdStr, out var customerId))
            {
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer != null)
                {
                    _logger.LogInformation("Found customer {CustomerId}, current level={Level}, TenantId={TenantId}", 
                        customerId, customer.MembershipLevel, customer.TenantId);
                    
                    // If customer doesn't have a Tenant, create one
                    if (customer.TenantId == 0)
                    {
                        try
                        {
                            var tenant = new Tenant
                            {
                                Name = customer.Email
                            };
                            _context.Tenants.Add(tenant);
                            await _context.SaveChangesAsync();
                            
                            customer.TenantId = tenant.Id;
                            _logger.LogInformation("Created Tenant {TenantId} for customer {CustomerId}", tenant.Id, customerId);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error creating Tenant for customer {CustomerId}", customerId);
                            // Continue anyway - don't fail the payment processing
                        }
                    }
                    
                    if (string.IsNullOrEmpty(priceId))
                    {
                        _logger.LogWarning("No price_id found in payment intent metadata for customer {CustomerId}", customerId);
                        return;
                    }

                    _logger.LogInformation("Looking up membership level for priceId: {PriceId}", priceId);
                    var newLevel = GetMembershipLevelFromPriceId(priceId!);
                    _logger.LogInformation("GetMembershipLevelFromPriceId returned: {Level} (null={IsNull})", newLevel, newLevel == null);
                    
                    if (newLevel.HasValue)
                    {
                        customer.MembershipLevel = newLevel.Value;
                        customer.IsActive = true;
                        await _context.SaveChangesAsync();

                        _logger.LogInformation(
                            "Updated customer {CustomerId} to membership level {Level} ({LevelValue}) via Stripe payment {PaymentIntentId}",
                            customerId, newLevel.Value, (int)newLevel.Value, paymentIntent.Id);
                    }
                    else
                    {
                        _logger.LogError("Could not determine membership level from priceId {PriceId} for customer {CustomerId}", priceId, customerId);
                    }
                }
                else
                {
                    _logger.LogWarning("Customer {CustomerId} not found for payment intent {PaymentIntentId}", customerId, paymentIntent.Id);
                }
            }
            else
            {
                _logger.LogWarning("Could not parse customer_id from payment intent metadata: {CustomerId}", customerIdStr);
            }
        }

        private async Task HandleSubscriptionCreated(Subscription subscription)
        {
            _logger.LogInformation("New subscription created: {SubscriptionId} for customer {CustomerId}", 
                subscription.Id, subscription.CustomerId);
            
            try
            {
                // Get the Stripe customer to find our internal customer ID
                var stripeCustomerService = new CustomerService();
                var stripeCustomer = await stripeCustomerService.GetAsync(subscription.CustomerId);
                
                if (stripeCustomer?.Metadata?.TryGetValue("customer_id", out var customerIdStr) == true &&
                    int.TryParse(customerIdStr, out var customerId))
                {
                    var customer = await _context.Customers.FindAsync(customerId);
                    if (customer != null)
                    {
                        var newLevel = GetMembershipLevelFromSubscriptionItemPrice(subscription.Items.Data.FirstOrDefault()?.Price?.Id);
                        if (newLevel.HasValue)
                        {
                            customer.MembershipLevel = newLevel.Value;
                            customer.IsActive = true;
                            customer.CancelledAt = null;
                            await _context.SaveChangesAsync();

                            _logger.LogInformation(
                                "Updated customer {CustomerId} to membership level {Level} via subscription {SubscriptionId}",
                                customerId, newLevel.Value, subscription.Id);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling subscription created for {SubscriptionId}", subscription.Id);
            }
        }

        private async Task HandleSubscriptionUpdated(Subscription subscription)
        {
            _logger.LogInformation("Subscription updated: {SubscriptionId} for customer {CustomerId}", 
                subscription.Id, subscription.CustomerId);
            
            try
            {
                // If subscription was reactivated (was canceled but now active)
                if (subscription.Status == "active")
                {
                    var stripeCustomerService = new CustomerService();
                    var stripeCustomer = await stripeCustomerService.GetAsync(subscription.CustomerId);
                    
                    if (stripeCustomer?.Metadata?.TryGetValue("customer_id", out var customerIdStr) == true &&
                        int.TryParse(customerIdStr, out var customerId))
                    {
                        var customer = await _context.Customers.FindAsync(customerId);
                        if (customer != null)
                        {
                            var newLevel = GetMembershipLevelFromSubscriptionItemPrice(subscription.Items.Data.FirstOrDefault()?.Price?.Id);
                            if (newLevel.HasValue)
                            {
                                customer.MembershipLevel = newLevel.Value;
                                customer.IsActive = true;
                                customer.CancelledAt = null;
                                await _context.SaveChangesAsync();

                                _logger.LogInformation(
                                    "Subscription updated: customer {CustomerId} to level {Level}",
                                    customerId, newLevel.Value);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling subscription updated for {SubscriptionId}", subscription.Id);
            }
        }

        private async Task HandleSubscriptionCanceled(Subscription subscription)
        {
            _logger.LogInformation("Subscription canceled: {SubscriptionId} for customer {CustomerId}", 
                subscription.Id, subscription.CustomerId);
            
            try
            {
                var stripeCustomerService = new CustomerService();
                var stripeCustomer = await stripeCustomerService.GetAsync(subscription.CustomerId);
                
                if (stripeCustomer?.Metadata?.TryGetValue("customer_id", out var customerIdStr) == true &&
                    int.TryParse(customerIdStr, out var customerId))
                {
                    var customer = await _context.Customers.FindAsync(customerId);
                    if (customer != null)
                    {
                        // Mark as inactive but allow login
                        customer.IsActive = false;
                        customer.CancelledAt = DateTime.UtcNow;
                        // Don't downgrade membership - user can still see reports until upgrade
                        // But the app will block report/dashboard access based on IsActive flag
                        await _context.SaveChangesAsync();

                        _logger.LogInformation(
                            "Marked customer {CustomerId} as inactive due to subscription cancellation",
                            customerId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling subscription canceled for {SubscriptionId}", subscription.Id);
            }
        }

        private async Task HandleInvoicePaid(Invoice invoice)
        {
            _logger.LogInformation("Invoice paid: {InvoiceId} for customer {CustomerId}", 
                invoice.Id, invoice.CustomerId);
            
            try
            {
                // Find customer and update status if they were previously inactive
                var stripeCustomerService = new CustomerService();
                var stripeCustomer = await stripeCustomerService.GetAsync(invoice.CustomerId);
                
                if (stripeCustomer?.Metadata?.TryGetValue("customer_id", out var customerIdStr) == true &&
                    int.TryParse(customerIdStr, out var customerId))
                {
                    var customer = await _context.Customers.FindAsync(customerId);
                    if (customer != null && !customer.IsActive)
                    {
                        // Reactivate if invoice was paid (e.g., retry succeeded)
                        customer.IsActive = true;
                        customer.CancelledAt = null;
                        await _context.SaveChangesAsync();

                        _logger.LogInformation(
                            "Reactivated customer {CustomerId} after successful invoice payment",
                            customerId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling invoice paid for {InvoiceId}", invoice.Id);
            }
        }

        private async Task HandleInvoicePaymentFailed(Invoice invoice)
        {
            _logger.LogInformation("Invoice payment failed: {InvoiceId} for customer {CustomerId}", 
                invoice.Id, invoice.CustomerId);
            
            try
            {
                // Notify customer of failed payment
                var stripeCustomerService = new CustomerService();
                var stripeCustomer = await stripeCustomerService.GetAsync(invoice.CustomerId);
                
                if (stripeCustomer?.Metadata?.TryGetValue("customer_id", out var customerIdStr) == true &&
                    int.TryParse(customerIdStr, out var customerId))
                {
                    var customer = await _context.Customers.FindAsync(customerId);
                    if (customer != null)
                    {
                        // Log the failed payment but don't immediately deactivate
                        // (Stripe will retry automatically, only deactivate on subscription.deleted)
                        _logger.LogWarning(
                            "Payment failed for customer {CustomerId}. Invoice: {InvoiceId}. Stripe will retry.",
                            customerId, invoice.Id);
                        
                        // TODO: Send email notification to customer about failed payment
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling invoice payment failed for {InvoiceId}", invoice.Id);
            }
        }

        private int GetPriceAmount(string stripePriceId)
        {
            _logger.LogDebug("GetPriceAmount called with stripePriceId: {StripePriceId}", stripePriceId);
            
            // Reverse lookup: find which config key maps to this Stripe price ID
            var priceIds = _configuration.GetSection("Stripe:PriceIds");
            var configKey = priceIds.GetChildren()
                .FirstOrDefault(x => x.Value == stripePriceId)?
                .Key;
            
            _logger.LogDebug("Found configKey {ConfigKey} for stripePriceId {StripePriceId}", configKey ?? "(null)", stripePriceId);
            
            if (configKey != null)
            {
                var amounts = _configuration.GetSection("Stripe:PriceAmounts");
                var amountStr = amounts[configKey];
                
                _logger.LogDebug("Amount config for {ConfigKey}: {AmountStr}", configKey, amountStr ?? "(null)");
                
                if (int.TryParse(amountStr, out var amount))
                {
                    _logger.LogDebug("Successfully parsed amount {Amount} for configKey {ConfigKey}", amount, configKey);
                    return amount;
                }
            }
            
            _logger.LogWarning("Failed to find or parse amount for stripePriceId {StripePriceId}. configKey: {ConfigKey}", stripePriceId, configKey ?? "(not found)");
            return 0;
        }

        private MembershipLevel? GetMembershipLevelFromPriceId(string stripePriceId)
        {
            _logger.LogInformation("GetMembershipLevelFromPriceId called with stripePriceId: {StripePriceId}", stripePriceId);
            
            // Reverse lookup: find which config key maps to this Stripe price ID
            var priceIds = _configuration.GetSection("Stripe:PriceIds");
            
            var configKey = priceIds.GetChildren()
                .FirstOrDefault(x => x.Value == stripePriceId)?
                .Key;
            
            _logger.LogInformation("Available price ID mappings:");
            foreach (var child in priceIds.GetChildren())
            {
                _logger.LogInformation("  {Key}={Value}", child.Key, child.Value);
            }
            
            _logger.LogInformation("Lookup result: configKey={ConfigKey} for stripePriceId={StripePriceId}", configKey ?? "(null)", stripePriceId);
            
            if (configKey == null)
            {
                _logger.LogWarning("No matching config key found for stripePriceId {StripePriceId}", stripePriceId);
                return null;
            }
            
            var result = configKey switch
            {
                "standard_monthly" => (MembershipLevel?)MembershipLevel.Standard,
                "premium_monthly" => (MembershipLevel?)MembershipLevel.Premium,
                "enterprise_monthly" => (MembershipLevel?)MembershipLevel.Enterprise,
                _ => null
            };
            
            _logger.LogInformation("GetMembershipLevelFromPriceId result: {Result} ({ResultValue}) for configKey {ConfigKey}", 
                result?.ToString() ?? "(null)", result.HasValue ? (int)result.Value : -1, configKey);
            return result;
        }

        private MembershipLevel? GetMembershipLevelFromSubscriptionItemPrice(string? stripePriceId)
        {
            if (string.IsNullOrEmpty(stripePriceId))
                return null;

            _logger.LogDebug("GetMembershipLevelFromSubscriptionItemPrice called with stripePriceId: {StripePriceId}", stripePriceId);
            
            // Reverse lookup: find which config key maps to this Stripe price ID
            var priceIds = _configuration.GetSection("Stripe:PriceIds");
            var configKey = priceIds.GetChildren()
                .FirstOrDefault(x => x.Value == stripePriceId)?
                .Key;
            
            _logger.LogDebug("Found configKey {ConfigKey} for stripePriceId {StripePriceId}", configKey ?? "(null)", stripePriceId);
            
            if (configKey == null)
                return null;

            var result = configKey switch
            {
                "standard_monthly" => (MembershipLevel?)MembershipLevel.Standard,
                "premium_monthly" => (MembershipLevel?)MembershipLevel.Premium,
                "enterprise_monthly" => (MembershipLevel?)MembershipLevel.Enterprise,
                _ => null
            };
            
            _logger.LogDebug("GetMembershipLevelFromSubscriptionItemPrice result: {Result} for configKey {ConfigKey}", result, configKey);
            return result;
        }
    }

    public class CreatePaymentIntentRequest
    {
        public string PriceId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }
}