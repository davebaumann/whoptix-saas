# SkuVault SaaS - AI Agent Instructions

Warehouse management SaaS integrating Stripe payments and SkuVault inventory APIs.

## Architecture

**Monorepo structure:**
- `frontend/` — React 18 + TypeScript + Vite (port 5173)
- `backend/` — .NET 8 C# ASP.NET Core API (port 5239)
- `scripts/` — PowerShell environment setup utilities

**Data flow:** Frontend (JWT auth) → Backend API → MySQL database + SkuVault API

**Key cross-component patterns:**
- JWT authentication: Tokens include email claim at `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
- Configuration injection: `IConfiguration` used for Stripe keys, sync intervals, tier pricing
- Base controller pattern: All controllers inherit `BaseController` with caching and logging
- Tenant isolation: `UserContextService` ensures customers see only their data

## Critical Workflows

### Build & Run
```powershell
# Frontend (from frontend/)
npm install && npm run dev        # Local: http://localhost:5173
npm run build                     # Production build

# Backend (from backend/SkuVaultSaaS.Api/)
dotnet run                        # Local: http://localhost:5239
dotnet build                      # Compilation only
./switch-to-dev.ps1              # Switch config to Development

# Environment switching
./switch-to-uat.ps1              # Switch to UAT environment
./switch-to-prod.ps1             # Switch to Production
```

### Database
- MySQL at `ftp.davidbaumann.pro:3306`
- Run `database-setup.sql` first-time setup
- Migrations auto-run on app startup
- Development seeding enabled in Dev environment (see backend README.md)

## Project Patterns & Conventions

### Backend (.NET)
**Dependency Injection (DI):**
- Injected in constructor: `IConfiguration`, `ApplicationDbContext`, `ICachingService`, `ILogger`
- Register in `Program.cs` lines 20-45
- Example: `CustomersController` receives `IConfiguration` for Stripe config access

**Configuration structure** (`appsettings.Development.json`):
- `Stripe.PriceIds`: Maps tier names to Stripe price IDs (e.g., `"standard_monthly": "price_1SicwS17Q4Cr8TzenL7IUQ9D"`)
- `Stripe.PriceAmounts`: Maps same tier names to dollar amounts (99, 199, 299)
- `SyncSettings`: Controls SkuVault sync timing and intervals
- Environment variable substitution: `${DB_NAME}`, `${ENCRYPTION_KEY}` replaced at runtime

**Reverse lookup pattern** (SkuVault/Stripe integration):
- Problem: Need to map Stripe price ID → tier name → amount
- Solution: Read `Stripe.PriceIds` section, find matching key for given price ID, then lookup amount
- Example: See `StripeController.GetPriceAmount()` and `GetMembershipLevelFromPriceId()`

**Common controller pattern:**
```csharp
[ApiController]
[Route("api/[controller]")]
public class MyController : BaseController
{
    public MyController(ApplicationDbContext context, ICachingService cache, ILogger<MyController> logger, IConfiguration config)
        : base(context, cache, logger) { _configuration = config; }
    
    // Caching: await GetCachedAsync(cacheKey, () => dbQuery)
    // Invalidate: await InvalidateCacheAsync("customer:123:*")
}
```

**JWT claim extraction:**
- Correct claim: `User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value`
- Fallback chain: Also try `JwtRegisteredClaimNames.Email` and plain "email" claim
- Used in: `CustomersController`, `UpdateSkuVaultCredentials()`, `RefreshSkuVaultTokens()`

### Frontend (React + TypeScript)
**Context providers** (in App.tsx):
- `AuthProvider`: Manages user login/logout, JWT token storage
- `MembershipProvider`: Caches membership tier info and available reports
- Both required for protected routes to function

**Page organization:**
- Pages use `ProtectedRoute` component for authentication
- Inside `Layout` component which provides navigation
- Example route: `/app/payment-success` → `PaymentSuccess.tsx`

**API patterns:**
- Centralized services in `src/api/` (e.g., `stripeService.ts`, `membershipService.ts`)
- Fetch wrapper handles auth headers and error responses
- TanStack Query for cache management (see `useQuery`, `useMutation`)

**Stripe integration:**
- Price IDs: `getPriceIdFromTier(2/3/4)` returns actual Stripe IDs like `price_1SicwS17Q4Cr8TzenL7IUQ9D`
- Flow: Select tier → Payment form → `confirmCardPayment()` → webhook confirms → redirect to `/app/payment-success`
- Webhook endpoint: POST `/api/stripe/webhook` handles `payment_intent.succeeded` events

**SkuVault credential flow:**
1. User enters email + password in `SkuVaultConnection.tsx`
2. POST `/api/customers/connect-skuvault` saves to database
3. Backend calls SkuVault API: `POST https://app.skuvault.com/api/gettokens?format=json` (form-encoded, not JSON)
4. Response includes `TenantToken` and `UserToken` for future API calls
5. Success redirects to dashboard

## Key Files & Examples

| File | Purpose |
|------|---------|
| `backend/SkuVaultSaaS.Api/Controllers/BaseController.cs` | Caching utilities, tenant isolation patterns |
| `backend/SkuVaultSaaS.Api/Controllers/CustomersController.cs` | SkuVault credential management, JWT extraction |
| `backend/SkuVaultSaaS.Api/Controllers/StripeController.cs` | Payment intent creation, webhook handling, reverse lookups |
| `backend/SkuVaultSaaS.Api/Controllers/MembershipController.cs` | Membership info endpoint with pricing/renewal dates |
| `frontend/src/App.tsx` | Route definitions, context provider wrapping |
| `frontend/src/contexts/AuthContext.tsx` | JWT token management, user state |
| `frontend/src/pages/StripeSetup.tsx` | Stripe payment form, tier selection |
| `frontend/src/pages/PaymentSuccess.tsx` | Post-payment thank-you page |
| `frontend/src/pages/SkuVaultConnection.tsx` | SkuVault credential entry form |

## Integration Points & External APIs

**Stripe (Test mode):**
- Webhook receives POST at `/api/stripe/webhook`
- Updates `Customer.MembershipLevel` and `Customer.IsActive` on success
- Requires ngrok for local webhook testing: `ngrok http 5239`

**SkuVault (External inventory system):**
- Token endpoint: `https://app.skuvault.com/api/gettokens?format=json`
- Request format: Form-encoded (Content-Type: `application/x-www-form-urlencoded`)
- Required fields: `Email`, `Password`
- Response: `{"TenantToken": "...", "UserToken": "...", "AccountId": "..."}`
- Stored in `Tenant` table for future API calls

## Development Environment

**Defaults (Development):**
- Stripe: Test mode keys in `appsettings.Development.json`
- Database: `localhost:3306/skuvault_dev` (requires MySQL running)
- Seed data: Auto-created (admin@example.com / P@ssw0rd!)
- Email: Fake SMTP (logged to console)
- Frontend: CORS enabled for localhost:5173

**Port assignments:**
- Frontend dev: 5173
- Backend API: 5239
- MySQL: 3306
- ngrok webhook: varies

## Tips for Agents

1. **Before adding endpoints:** Check if similar pattern exists in existing controller (e.g., payment handling in StripeController)
2. **Configuration changes:** Update BOTH `appsettings.Development.json` AND any `switch-to-*.ps1` scripts if adding new keys
3. **API request debugging:** Add logging before/after HTTP calls to SkuVault/Stripe APIs - third-party responses often contain error details
4. **TypeScript strict mode:** Frontend uses `strict: true` - check type compatibility before assuming nulls/optionals
5. **Cache invalidation:** After updating cached data (e.g., SkuVault tokens), call `InvalidateCacheAsync()` with appropriate pattern
6. **Reverse lookups essential:** Never assume Stripe price ID → tier mapping is bidirectional - always implement reverse lookup pattern seen in `GetPriceAmount()`
