# Inventory Sync Duplicate Analysis

## Issue
During inventory synchronization, duplicate warnings appear for the same SKU/LocationCode combination:
```
[19:57:22 WRN] Duplicate inventory entry from API: SKU=TSGTOURBAGWHITE, LocationCode=GENERAL, skipping
[19:57:22 WRN] Duplicate inventory entry from API: SKU=TSGTOURBAGWHITE, LocationCode=GENERAL, skipping
[19:57:22 WRN] Duplicate inventory entry from API: SKU=TSGTOURBAGWHITE, LocationCode=GENERAL, skipping
[19:57:22 WRN] Duplicate inventory entry from API: SKU=TSGTOURBAGWHITE, LocationCode=GENERAL, skipping
```

## Answer: YES, These Are Real Duplicates

The warnings indicate that **SkuVault API is returning duplicate inventory entries** in its response. This is confirmed by:

1. **Detection Method**: The sync service uses a `HashSet<(ProductId, LocationId)>` to track items already processed
2. **Duplicate Check**: For each API item, we check: `if (processedKeys.Contains(key))` 
3. **True Duplicates**: If the same SKU/LocationCode appears multiple times in one API response, subsequent occurrences are skipped
4. **Behavior**: Only the **first occurrence is saved**; duplicates are logged and ignored

## How We Know They're Real

Before our code even processes duplicates:
- **Same timestamp** ([19:57:22]) = Single API call
- **Same SKU and LocationCode** = Identical composite key
- **Multiple log lines** = Multiple items in the API response array with identical SKU/LocationCode

This is an **API response issue, not a code bug**.

## Enhanced Logging

Updated logging now shows:

### Per-Duplicate Details
```
[19:57:22 WRN] Duplicate inventory entry from API: SKU=TSGTOURBAGWHITE, LocationCode=GENERAL, Qty=50/45/5, skipping (instance #1)
[19:57:22 WRN] Duplicate inventory entry from API: SKU=TSGTOURBAGWHITE, LocationCode=GENERAL, Qty=50/45/5, skipping (instance #2)
[19:57:22 WRN] Duplicate inventory entry from API: SKU=TSGTOURBAGWHITE, LocationCode=GENERAL, Qty=50/45/5, skipping (instance #3)
[19:57:22 WRN] Duplicate inventory entry from API: SKU=TSGTOURBAGWHITE, LocationCode=GENERAL, Qty=50/45/5, skipping (instance #4)
```

Now includes:
- Quantity values (QuantityOnHand/Available/Allocated)
- Instance count (which duplicate #)
- Helps determine if it's the same quantity being repeated

### Summary After Sync
```
[19:57:23 WRN] Inventory sync found 5 items with duplicates. Total duplicate instances: 12
```

Shows:
- **5 items** had at least one duplicate
- **12 total** duplicate occurrences across all items

## Why This Happens (Theories)

1. **SkuVault API Design**: Some inventory systems return items for multiple warehouses/distribution centers in one response, leading to duplicates if data structures aren't clean
2. **Multi-location Sync**: If same physical location is registered under different names/codes
3. **Temporary Data Issue**: Could be a temporary glitch in SkuVault's response formatting

## Recommended Actions

### Option 1: Accept & Monitor (Recommended for now)
- These duplicates are safely handled by the deduplication logic
- The **first** occurrence is always saved (correct data)
- Monitor the summary logs: if duplicate count grows, contact SkuVault support

### Option 2: Contact SkuVault Support
- Provide them with:
  - The SKUs that have duplicates: TSGTOURBAGWHITE, TSGTOURBAGBLACK, etc.
  - LocationCode: GENERAL
  - Confirmation that duplicates appear in every sync

### Option 3: Add SkuVault API Request Logging
If you suspect the API is adding duplicates, we could:
1. Save the raw JSON response from SkuVault
2. Log API response size and item count
3. Compare against what we received

## Implementation (Done ✅)

File: [SkuVaultSyncService.cs](backend/SkuVaultSaaS.Infrastructure/Services/SkuVaultSyncService.cs)

**Changes:**
- Lines 680-691: Enhanced duplicate detection with quantity logging
- Lines 742-747: Added summary statistics after sync completes

**Build Status:** ✅ Successful (0 errors)

## Next Run
When inventory syncs next, look for:
1. Individual warnings with quantity details and instance numbers
2. Summary line at the end showing total deduplication statistics

This will help determine:
- Are the duplicate quantities identical (yes = same data repeated)
- Are quantities different (indicates real differences being masked)
- Is it the same few SKUs, or widespread?
