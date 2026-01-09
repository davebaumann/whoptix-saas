# UAT Deployment Checklist - Footer Feature

## Build Status
✅ Backend: Built successfully (Release mode)
✅ Frontend: Built successfully

## Deployment Steps

### 1. Backend Deployment

**Files Location:**
- Published binaries: `c:\Users\dcbau\Code\SkuVaultSaaS\backend\SkuVaultSaaS.Api\publish\`
- Configuration: Using UAT appsettings (switched via switch-to-uat.ps1)

**To Deploy to UAT Server:**
```powershell
# On deployment machine, upload:
scp -r publish/* user@uat-server:/app/skuvault-api/

# Restart the service
ssh user@uat-server "systemctl restart skuvault-api"
```

### 2. Frontend Deployment

**Files Location:**
- Built assets: `c:\Users\dcbau\Code\SkuVaultSaaS\frontend\dist\`
- Ready for Azure Static Web Apps deployment

**To Deploy to Azure Static Web Apps:**
```bash
# Ensure logged in to Azure
az login

# Deploy using Azure CLI
az staticwebapp update --name justsku-uat --source ./dist --location eastus
```

### 3. Database Migration

**For UAT Database (ftp.davidbaumann.pro/skuvault_uat):**

**Option A: Automatic (recommended)**
- The application will auto-run EF Core migrations on startup
- Migration: `20260107000000_AddSuggestionsTable`

**Option B: Manual SQL**
```bash
# Create the Suggestions table manually
mysql -h ftp.davidbaumann.pro -u {DB_USER} -p skuvault_uat < add-suggestions-table.sql
```

### 4. Environment Configuration

Ensure UAT server has these environment variables set:
```
DB_NAME=skuvault_uat
DB_USER={username}
DB_PASSWORD={password}
ENCRYPTION_KEY={key}
ENCRYPTION_IV={iv}
EMAIL_PASSWORD={password}
STRIPE_SECRET_KEY={uat_key}
STRIPE_PUBLISHABLE_KEY={uat_key}
```

## Features Deployed

### Frontend
- ✅ Footer Component with support links
- ✅ Suggestion Box Modal form
- ✅ Responsive design (mobile/desktop)
- ✅ JWT authentication integration

### Backend
- ✅ SuggestionsController with 4 endpoints
- ✅ Suggestion model with full tracking
- ✅ Role-based access control
- ✅ Error handling and logging

### Database
- ✅ Suggestions table with indexes
- ✅ Foreign key to Customers
- ✅ Proper character encoding (utf8mb4)

## Testing in UAT

### 1. Verify Backend Health
```bash
curl https://uat-api.justsku.com/health
# Should return 200 OK
```

### 2. Test Footer Visibility
1. Navigate to https://uat.justsku.com/app/dashboard
2. Sign in with test account
3. Scroll to bottom of page
4. Verify footer displays with 4 columns
5. Click "Suggestion Box" link

### 3. Test Suggestion Submission
1. Click "Suggestion Box" button in footer
2. Type a test message
3. Verify email is pre-filled
4. Click "Send Feedback"
5. Should see success message
6. Modal should close automatically

### 4. Verify Database
```sql
-- Check UAT database
SELECT * FROM skuvault_uat.Suggestions 
ORDER BY CreatedAt DESC LIMIT 5;
```

### 5. Test Admin Endpoints (for Account Admin only)
```bash
# List all suggestions (requires auth token)
curl -H "Authorization: Bearer {JWT_TOKEN}" \
  https://uat-api.justsku.com/api/suggestions

# Mark as read
curl -X PUT -H "Authorization: Bearer {JWT_TOKEN}" \
  https://uat-api.justsku.com/api/suggestions/{id}
```

## Rollback Plan

If issues occur:

1. **Database:** Table is safely isolated, can delete with:
   ```sql
   DROP TABLE skuvault_uat.Suggestions;
   ```

2. **Backend:** Revert to previous release from backup

3. **Frontend:** Redeploy previous stable build from dist backup

## Success Criteria

- [ ] Backend API responds to requests
- [ ] Frontend loads without errors (check console)
- [ ] Footer displays on authenticated pages
- [ ] Suggestion form submits successfully
- [ ] Suggestions appear in database
- [ ] Admin endpoints return paginated suggestions
- [ ] No error logs in application
- [ ] Page load time acceptable (<3s)

## Post-Deployment Actions

1. Monitor application logs for errors
2. Test with actual UAT users
3. Verify email notification system (if implemented)
4. Check performance metrics (response time, page load)
5. Document any issues found during UAT
6. Schedule fix deployment if needed
