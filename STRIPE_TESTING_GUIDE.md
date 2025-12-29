# Stripe Integration Testing Guide

## Prerequisites

1. **Backend Running**: `dotnet run` in `backend/SkuVaultSaaS.Api/`
   - Should be listening on `https://localhost:5239`

2. **Frontend Running**: `npm run dev` in `frontend/`
   - Should be on `http://localhost:5173`

3. **Ngrok Running** (for webhook testing):
   ```powershell
   # In another terminal:
   ngrok http https://localhost:5239
   ```
   - Copy the HTTPS URL and update Stripe Dashboard webhook endpoint

4. **Test Environment**:
   - All keys in `appsettings.Development.json` are test keys
   - Stripe Dashboard is in **Test Mode** (toggle top left)

## Test Flow 1: Payment Intent (One-Time Payment)

### Step 1: Navigate to Checkout
```
1. Open http://localhost:5173/membership/upgrade
2. Should see 3 tiers:
   - Standard: $59/month
   - Premium: $99/month  
   - Enterprise: $199/month
```

### Step 2: Select Tier and Pay
```
1. Click "Subscribe" on Standard ($59)
2. Should redirect to CardElement form
3. Enter test card: 4242 4242 4242 4242
4. Expiry: Any future date (e.g., 12/25)
5. CVC: Any 3 digits (e.g., 123)
6. Cardholder: Any name
7. Click "Pay $59.00"
```

### Step 3: Verify Payment Success
```
Frontend should:
- Show success message or redirect to dashboard
- No console errors

Backend logs should show:
- "[StripeController] Payment intent created"
- "Amount in cents: 5900"

Stripe Dashboard (https://dashboard.stripe.com/test/payments):
- Should see new payment intent with status "succeeded"
```

### Step 4: Verify Membership Update
```
Database check:
- Customer.MembershipLevel should be 2 (Standard)
- Customer.IsActive should be true
- Customer.CancelledAt should be null

API check:
- GET /api/reports/customer/{customerId}/summary 
- Should return 200 (not forbidden)
```

---

## Test Flow 2: Subscription Creation (Recurring)

### Step 1: Create Subscription
```
1. From /membership/upgrade, select Premium ($99)
2. Fill in CardElement
3. Pay
```

### Step 2: Verify Webhook Receipt
```
In ngrok terminal, should see:
- POST /api/stripe/webhook HTTP/1.1 200
- Multiple events: payment_intent.succeeded, customer.subscription.created

Backend logs should show:
- "Handling subscription.created event"
- "Updated customer {Id} to membership level 3"
- IsActive set to true
```

### Step 3: Check Stripe Dashboard
```
1. Go to https://dashboard.stripe.com/test/subscriptions
2. Should see new subscription with status "active"
3. Next billing date: 30 days from now
4. Amount: $99.00
```

---

## Test Flow 3: Subscription Cancellation

### Step 1: Cancel Subscription
```
1. In Stripe Dashboard: Subscriptions → Select active subscription
2. Click "Cancel subscription"
3. Confirm cancellation (immediate or at end of period)
```

### Step 2: Verify Webhook Cancellation Event
```
In ngrok terminal:
- Should see: customer.subscription.deleted event

Backend logs:
- "Handling subscription.canceled event"
- "Set IsActive = false for customer {Id}"
- CancelledAt timestamp logged
```

### Step 3: Verify Account Deactivation
```
Database check:
- Customer.IsActive should be false
- Customer.CancelledAt should have timestamp
- Customer.MembershipLevel should still be 3 (unchanged)

Frontend behavior:
- User can still login
- Dashboard should show "Subscription inactive" message
- Report endpoints return 403 Forbidden
- Button to upgrade/reactivate should appear
```

---

## Test Flow 4: Invoice/Billing Events

### Step 1: Wait for First Invoice
```
Time: After payment → Next billing date (30 days)
Invoice should be auto-created and paid
```

### Step 2: Verify Webhook Events
```
In ngrok terminal, watch for:
- invoice.created event
- invoice.payment_succeeded event

Backend logs:
- "Handling invoice.payment_succeeded"
- Verify IsActive remains true if auto-payment succeeds
```

### Step 3: Test Failed Invoice
```
1. Create subscription with test card: 4000000000000002 (always fails)
2. Wait for billing date
3. Should receive invoice.payment_failed webhook
4. Backend logs and IsActive management tested
```

---

## Test Cards (Stripe Test Mode)

| Card Number | Effect |
|-------------|--------|
| 4242 4242 4242 4242 | ✅ Succeeds |
| 4000000000000002 | ❌ Declines - generic decline |
| 4000002500003155 | ❌ Declines - fraud suspected |
| 4000003560000008 | ⚠️ 3D Secure required |

---

## Troubleshooting

### Issue: "Customer not found" error
- ✅ Verify email matches database customer email
- ✅ Ensure customer exists in SQL

### Issue: Webhook not received
- Check ngrok is still running
- Verify webhook URL in Stripe Dashboard matches ngrok HTTPS URL
- Check `Stripe:WebhookSecret` in appsettings matches Stripe Dashboard

### Issue: "Invalid price ID" error
- Verify priceId in request matches config:
  - `standard_monthly` → tier 2
  - `premium_monthly` → tier 3
  - `enterprise_monthly` → tier 4
- Check appsettings.Development.json has correct PriceIds

### Issue: Payment succeeds but membership not updated
- Check webhook secret is correct
- Verify webhook endpoint is receiving requests (ngrok logs)
- Check backend logs for webhook processing

### Issue: Build fails with SubscriptionItem error
- Should be fixed now (uses `.Price?.Id`)
- If not, ensure latest code is pulled and rebuilt

---

## Key API Endpoints

```
POST /api/stripe/create-payment-intent
Body: { "email": "customer@example.com", "priceId": "standard_monthly" }
Returns: { "clientSecret": "pi_...", "customerId": "cus_..." }

POST /api/stripe/webhook
Headers: Stripe-Signature
Body: JSON event from Stripe
Returns: 200 OK (must return 200 quickly)

GET /api/reports/customer/{customerId}/summary
Returns: 200 if IsActive=true, 403 if IsActive=false
```

---

## Success Criteria

- ✅ Payment intent succeeds with test card 4242...
- ✅ Webhook receives customer.subscription.created event
- ✅ Customer.MembershipLevel updates correctly (2/3/4)
- ✅ Customer.IsActive set to true after payment
- ✅ Cancellation sets IsActive=false without changing MembershipLevel
- ✅ Report endpoints check IsActive before returning data
- ✅ All webhook events logged with customer metadata
