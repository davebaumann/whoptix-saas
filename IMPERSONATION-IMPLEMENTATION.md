# Impersonation Implementation Review

## Current Implementation

### How It Works:
1. **Admin Role Check**: Uses ASP.NET Identity role system - `User.IsInRole("Admin")`
   - Defined in `UserContextService.IsAdmin()` → checks JWT claims for "Admin" role
   
2. **Header-Based Impersonation**: Uses `X-Impersonate-Customer-Id` header
   - Frontend sends this header when impersonating a customer
   - Backend checks if user is admin before allowing impersonation
   
3. **Two-Part Flow**:
   - **Backend** (`ReportsController.GetEffectiveCustomerId()`):
     - Checks `X-Impersonate-Customer-Id` header
     - Verifies user has Admin role
     - Returns impersonated customer ID if admin, else user's own ID
   
   - **Frontend** (`membershipService.ts`, `client.ts`):
     - Stores impersonation context in `sessionStorage` as `adminViewingAs`
     - Adds `X-Impersonate-Customer-Id` header to API requests
     - Refreshes membership info with impersonated customer ID

### Key Code Locations:

**Backend:**
- [`UserContextService.cs#L60`](backend/SkuVaultSaaS.Api/Services/UserContextService.cs#L60) - IsAdmin() check
- [`ReportsController.cs#L130`](backend/SkuVaultSaaS.Api/Controllers/ReportsController.cs#L130) - GetEffectiveCustomerId()
- [`MembershipController.cs#L35`](backend/SkuVaultSaaS.Api/Controllers/MembershipController.cs#L35) - GetMembershipInfo() returns tier

**Frontend:**
- [`membershipService.ts#L46`](frontend/src/api/membershipService.ts#L46) - getMembershipInfo() with header
- [`client.ts#L330`](frontend/src/api/client.ts#L330) - Fetch wrapper adds header
- [`MembershipContext.tsx#L56`](frontend/src/contexts/MembershipContext.tsx#L56) - Uses effectiveCustomerId

---

## Answer to Your Question

### When Admin Impersonates a Customer:
✅ **Only sees reports for that customer's tier**

**Why?**
1. Backend `GetMembershipInfo()` looks up the **impersonated customer's ID** (not admin's)
2. Returns the **impersonated customer's MembershipLevel** from the Customer table
3. `_reportAccessService.GetAvailableReports()` uses that tier level to determine available reports
4. Admin role is NOT checked for report availability - only the customer's tier is used

**Example Flow:**
```
Admin (has Admin role) impersonates Premium customer (tier 3)
  ↓
Header: X-Impersonate-Customer-Id: 42
  ↓
Backend queries: Customer.Find(42).MembershipLevel → 3
  ↓
Returns: Reports available at tier 3 only
  ↓
Frontend shows: Standard, Premium, Aging Inventory (tier 3 reports)
  ✓ Does NOT show Enterprise reports (tier 4)
```

---

## Report Access Tier Matrix

Current tiers in code:
- **Tier 1**: Basic (Inventory, Channel Performance)
- **Tier 2**: Standard (Low Stock)
- **Tier 3**: Premium (Aging Inventory, Profitability, Demand Forecast, Financial, Locations, Picker Analytics)
- **Tier 4**: Enterprise (Performance Metrics)

**Key Finding:** Admin role itself does NOT bypass tier restrictions. Only the customer's actual MembershipLevel determines what's visible.

---

## To Add "Admin Testing" Tier (If Desired)

You have two options:

### Option A: Mark Reports as "In Development" (No Code Change)
- Keep current tier system as-is
- Use UI labels: "🚧 In Development" next to reports in admin view
- No database changes needed

### Option B: Add Tier 0 for Admin Testing
Would require:
1. Add `tier: 0` entry in `appsettings.json` ReportAccess config
2. Create test account with `MembershipLevel = 0`
3. Update `isReportAvailable()` in frontend to: `tier === 0 || currentTier >= requiredTier`
4. Use this tier for testing reports before promoting to tier 3/4

---

## Summary

**Current Behavior = "True Impersonation"** ✓
- Admin sees EXACTLY what the customer sees
- No special admin bypass
- Perfect for testing reports with actual tier restrictions
- No code changes needed - already working as intended!
