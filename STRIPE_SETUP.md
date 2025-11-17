# Stripe Integration Setup Guide

## Overview
This setup provides a complete Stripe-powered membership upgrade system for your SkuVault SaaS customers with four tiers:

- **Basic** - $29/month
- **Standard** - $59/month  
- **Premium** - $99/month
- **Enterprise** - $199/month

## Setup Instructions

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete business verification (for production)

### 2. Get API Keys
1. In Stripe Dashboard, go to **Developers → API keys**
2. Copy your **Publishable key** (starts with `pk_test_` for test mode)
3. Copy your **Secret key** (starts with `sk_test_` for test mode)

### 3. Configure Backend (appsettings.json)
```json
{
  "Stripe": {
    "PublishableKey": "pk_test_YOUR_ACTUAL_KEY_HERE",
    "SecretKey": "sk_test_YOUR_ACTUAL_KEY_HERE", 
    "WebhookSecret": "whsec_YOUR_WEBHOOK_SECRET_HERE"
  }
}
```

### 4. Configure Frontend (.env)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
```

### 5. Create Products in Stripe Dashboard
1. Go to **Products** in Stripe Dashboard
2. Create 4 products with these **exact** Price IDs:
   - `price_basic_monthly` - $29.00/month
   - `price_standard_monthly` - $59.00/month  
   - `price_premium_monthly` - $99.00/month
   - `price_enterprise_monthly` - $199.00/month

### 6. Set up Webhooks (Optional - for production)
1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `customer.subscription.*`
4. Copy the webhook signing secret to your config

## Features Included

### Frontend
- **Beautiful pricing page** with tier comparison
- **Secure Stripe Elements** for card input
- **Real-time payment processing** with loading states
- **Success/error handling** with user feedback
- **Mobile-responsive design** with modern UI
- **Current plan indication** and upgrade restrictions

### Backend
- **Secure Stripe integration** with proper error handling
- **Automatic membership updates** on successful payment
- **Webhook support** for subscription management
- **Customer creation/lookup** in Stripe
- **Metadata tracking** for internal customer mapping

### Security
- **Server-side payment processing** - no sensitive data in frontend
- **Webhook signature verification** 
- **Proper error handling** and logging
- **Authentication required** for all payment endpoints

## Testing
1. Use Stripe test cards: `4242 4242 4242 4242`
2. Any future expiration date and CVC
3. Watch Stripe Dashboard for test payments
4. Check customer membership updates in your database

## Customization
- Update pricing in `MembershipUpgrade.tsx`
- Modify features lists for each tier
- Add/remove tiers by updating both frontend and backend
- Customize email notifications
- Add annual billing options

The system is production-ready and follows Stripe best practices for secure payment processing.