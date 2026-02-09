# SkuVault Integrations Sync Implementation

## Overview
Added support for syncing SkuVault integrations data to the application. This allows tracking which integrations a SkuVault account is connected to.

## Database Setup

### SQL to Create Integrations Table

```sql
-- Create Integrations table
CREATE TABLE IF NOT EXISTS Integrations (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    TenantId INT NOT NULL,
    IntegrationName VARCHAR(255) NOT NULL,
    IntegrationCode VARCHAR(255) NOT NULL,
    Description VARCHAR(1000),
    IntegrationUrl VARCHAR(255),
    Status VARCHAR(50),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    RowVersion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (TenantId) REFERENCES Tenants(Id),
    UNIQUE KEY unique_tenant_code (TenantId, IntegrationCode),
    INDEX idx_tenant_id (TenantId),
    INDEX idx_integration_code (IntegrationCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Run this SQL on your production database:
```bash
mysql -h ftp.davidbaumann.pro -u admin -p justsku_prod < add-integrations-table.sql
```

## Files Created/Modified

### New Files
- `backend/SkuVaultSaas.Core/Models/Integration.cs` - Integration model
- `add-integrations-table.sql` - Database migration SQL

### Modified Files
- `backend/SkuVaultSaaS.Infrastructure/SkuVaultSaaSApi/ISkuVaultApiClient.cs`
  - Added `GetIntegrationsAsync()` method signature
  - Added `SkuVaultIntegrationDto` class
  
- `backend/SkuVaultSaaS.Infrastructure/SkuVaultSaaSApi/SkuVaultApiClient.cs`
  - Implemented `GetIntegrationsAsync()` method

- `backend/SkuVaultSaaS.Infrastructure/Data/ApplicationDbContext.cs`
  - Added `DbSet<Integration>` property
  - Added Integration entity configuration with foreign key and unique constraints

- `backend/SkuVaultSaaS.Infrastructure/Services/ISkuVaultSyncService.cs`
  - Added `SyncIntegrationsAsync()` method signature

- `backend/SkuVaultSaaS.Infrastructure/Services/SkuVaultSyncService.cs`
  - Implemented `SyncIntegrationsAsync()` method

- `backend/SkuVaultSaaS.Api/Controllers/SyncController.cs`
  - Added manual sync endpoint: `POST /api/sync/integrations/{customerId}`

## Testing the Integration

### 1. Build and Deploy

```powershell
# Build backend
cd backend
dotnet build

# Run database migrations (auto-run on startup)
dotnet run
```

### 2. Manually Trigger Sync (Admin Only)

```bash
curl -X POST http://localhost:5239/api/sync/integrations/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "message": "Integrations sync completed successfully",
  "customerId": 1
}
```

### 3. Verify Data in Database

```sql
SELECT * FROM Integrations WHERE TenantId = 1;
```

Expected columns:
- `Id` - Primary key
- `TenantId` - Reference to tenant
- `IntegrationName` - Name from SkuVault (e.g., "Amazon Integration")
- `IntegrationCode` - Code from SkuVault (e.g., "AMAZON")
- `Description` - Optional description
- `IntegrationUrl` - Optional URL to integration
- `Status` - Integration status
- `CreatedAt` - When first synced
- `UpdatedAt` - When last updated

### 4. SkuVault API Endpoint

The implementation calls: `POST /integrations/getIntegrations`

Expected response format from SkuVault:
```json
{
  "Integrations": [
    {
      "IntegrationName": "Amazon FBA",
      "IntegrationCode": "AMAZON_FBA",
      "Description": "Amazon Fulfillment by Amazon integration",
      "IntegrationUrl": "https://amazon.com",
      "Status": "Active"
    }
  ]
}
```

## Adding to Sync Schedule

To add automatic integrations sync to the scheduled sync:

1. **In `SkuVaultSyncService.SyncCustomerDataAsync()`**, add:
```csharp
await SyncIntegrationsAsync(customerId);
```

2. **In `ISkuVaultSyncService` configuration**, ensure the method is included in the scheduled sync interval defined in `appsettings.json`

3. **Configure sync interval in appsettings**:
```json
"SyncSettings": {
  "IntegrationsSyncIntervalMinutes": 1440  // Daily
}
```

## Data Model

### Integration Entity
```csharp
public class Integration
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string IntegrationName { get; set; }
    public string IntegrationCode { get; set; }
    public string? Description { get; set; }
    public string? IntegrationUrl { get; set; }
    public string? Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public byte[] RowVersion { get; set; }
    public Tenant Tenant { get; set; }
}
```

## API Endpoint

### Endpoint
- **Method**: `POST`
- **URL**: `/api/sync/integrations/{customerId}`
- **Auth**: Required (Admin role only)
- **Parameters**: `customerId` (path parameter)

### Response
```json
{
  "message": "Integrations sync completed successfully",
  "customerId": 1
}
```

### Error Response
```json
{
  "error": "Failed to sync integrations",
  "details": "Error message here"
}
```

## Next Steps

1. ✅ Created model and database table structure
2. ✅ Implemented API client method
3. ✅ Implemented sync service method
4. ✅ Created manual sync endpoint for testing
5. ⏳ Add to automatic sync schedule in `SyncCustomerDataAsync()`
6. ⏳ Test with real SkuVault customer data
7. ⏳ Deploy to production
