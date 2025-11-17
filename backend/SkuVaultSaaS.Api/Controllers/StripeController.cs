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
                        await HandlePaymentSuccess(paymentIntent);
                        break;

                    case "customer.subscription.created":
                        var subscription = stripeEvent.Data.Object as Subscription;
                        await HandleSubscriptionCreated(subscription);
                        break;

                    case "customer.subscription.updated":
                        var updatedSubscription = stripeEvent.Data.Object as Subscription;
                        await HandleSubscriptionUpdated(updatedSubscription);
                        break;

                    case "customer.subscription.deleted":
                        var deletedSubscription = stripeEvent.Data.Object as Subscription;
                        await HandleSubscriptionCanceled(deletedSubscription);
                        break;

                    default:
                        _logger.LogWarning("Unhandled Stripe webhook event type: {EventType}", stripeEvent.Type);
                        break;
                }

                return Ok();
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
                    var newLevel = GetMembershipLevelFromPriceId(priceId);
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
            // Handle new subscription creation
            _logger.LogInformation("New subscription created: {SubscriptionId}", subscription.Id);
        }

        private async Task HandleSubscriptionUpdated(Subscription subscription)
        {
            // Handle subscription updates (plan changes, etc.)
            _logger.LogInformation("Subscription updated: {SubscriptionId}", subscription.Id);
        }

        private async Task HandleSubscriptionCanceled(Subscription subscription)
        {
            // Handle subscription cancellation
            _logger.LogInformation("Subscription canceled: {SubscriptionId}", subscription.Id);
        }

        private int GetPriceAmount(string priceId)
        {
            return priceId switch
            {
                "price_basic_monthly" => 29,
                "price_standard_monthly" => 59,
                "price_premium_monthly" => 99,
                "price_enterprise_monthly" => 199,
                _ => 0
            };
        }

        private MembershipLevel? GetMembershipLevelFromPriceId(string priceId)
        {
            return priceId switch
            {
                "price_basic_monthly" => MembershipLevel.Basic,
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