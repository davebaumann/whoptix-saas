using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        public StripeController(
            ApplicationDbContext context,
            ILogger<StripeController> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;

            // Initialize Stripe
            StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];
        }

        [HttpPost("create-payment-intent")]
        public async Task<IActionResult> CreatePaymentIntent([FromBody] CreatePaymentIntentRequest request)
        {
            try
            {
                // Get the customer info
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Email == request.Email);

                if (customer == null)
                {
                    return NotFound("Customer not found");
                }

                // Get price amount based on priceId (you'll need to configure these)
                var priceAmount = GetPriceAmount(request.PriceId);
                if (priceAmount == 0)
                {
                    return BadRequest("Invalid price ID");
                }

                // Create or retrieve Stripe customer
                var stripeCustomerService = new CustomerService();
                var stripeCustomers = await stripeCustomerService.ListAsync(new CustomerListOptions
                {
                    Email = request.Email,
                    Limit = 1
                });

                string stripeCustomerId;
                if (stripeCustomers.Data.Count == 0)
                {
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
                }
                else
                {
                    stripeCustomerId = stripeCustomers.Data[0].Id;
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

        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> HandleWebhook()
        {
            try
            {
                var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
                var endpointSecret = _configuration["Stripe:WebhookSecret"];

                var stripeEvent = EventUtility.ConstructEvent(
                    json,
                    Request.Headers["Stripe-Signature"],
                    endpointSecret
                );

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

            if (int.TryParse(customerIdStr, out var customerId))
            {
                var customer = await _context.Customers.FindAsync(customerId);
                if (customer != null)
                {
                    var newLevel = GetMembershipLevelFromPriceId(priceId!);
                    if (newLevel.HasValue)
                    {
                        customer.MembershipLevel = newLevel.Value;
                        await _context.SaveChangesAsync();

                        _logger.LogInformation(
                            "Updated customer {CustomerId} to membership level {Level} via Stripe payment {PaymentIntentId}",
                            customerId, newLevel.Value, paymentIntent.Id);
                    }
                }
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

        private int GetPriceAmount(string priceId)
        {
            var amounts = _configuration.GetSection("Stripe:PriceAmounts");
            if (int.TryParse(amounts[priceId], out var amount))
            {
                return amount;
            }
            return 0;
        }

        private MembershipLevel? GetMembershipLevelFromPriceId(string priceId)
        {
            return priceId switch
            {
                "price_standard_monthly" => MembershipLevel.Standard,
                "price_premium_monthly" => MembershipLevel.Premium,
                "price_enterprise_monthly" => MembershipLevel.Enterprise,
                _ => null
            };
        }

        private MembershipLevel? GetMembershipLevelFromSubscriptionItemPrice(string? priceId)
        {
            if (string.IsNullOrEmpty(priceId))
                return null;

            return priceId switch
            {
                "price_standard_monthly" => MembershipLevel.Standard,
                "price_premium_monthly" => MembershipLevel.Premium,
                "price_enterprise_monthly" => MembershipLevel.Enterprise,
                _ => null
            };
        }
    }

    public class CreatePaymentIntentRequest
    {
        public string PriceId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }
}