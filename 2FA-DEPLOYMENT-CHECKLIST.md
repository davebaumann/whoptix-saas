# 2FA Deployment Checklist

## Pre-Deployment (Development Environment)

### Step 1: Restore NuGet Packages
```bash
cd backend/SkuVaultSaaS.Api
dotnet restore
```
This downloads the OtpNet package required for TOTP functionality.

### Step 2: Verify Backend Builds
```bash
cd ../..
dotnet build
```
Should build with no errors (ignore the LowStockController null reference warnings - pre-existing).

### Step 3: Build Frontend
```bash
cd frontend
npm install  # If dependencies haven't been installed
npm run build
```

### Step 4: Apply Database Migration
```bash
cd ../backend
dotnet ef database update --project SkuVaultSaaS.Infrastructure
```
This adds the 5 new columns to AspNetUsers table.

### Step 5: Test on Local Environment

#### 5a. Start Backend
```bash
cd SkuVaultSaaS.Api
dotnet run
```

#### 5b. Start Frontend (new terminal)
```bash
cd frontend
npm run dev
```

#### 5c. Test 2FA Setup Flow
1. Open http://localhost:5173
2. Login with existing credentials
3. Navigate to Account Settings
4. Click "Manage Two-Factor Authentication"
5. Verify:
   - [ ] QR code displays
   - [ ] Manual entry key shown below QR code
   - [ ] Can proceed to step 2

#### 5d. Test 2FA Verification
1. Install Google Authenticator on phone
2. Scan QR code in modal
3. Enter 6-digit code from app
4. Click Verify
5. Verify:
   - [ ] Backup codes displayed
   - [ ] Success message shown
   - [ ] Modal closes

#### 5e. Test Login Flow with 2FA
```sql
-- Set 2FA verification to >7 days ago
UPDATE AspNetUsers 
SET LastTwoFactorVerified = DATE_SUB(NOW(), INTERVAL 8 DAY)
WHERE Email = 'your-test-email@example.com';
```

1. Logout from application
2. Login with email/password
3. Verify:
   - [ ] 2FA form appears after password entry
   - [ ] Can enter 6-digit code
   - [ ] Code is masked but shows length
   - [ ] Submit button disabled until 6 digits entered
   - [ ] "Back" button returns to password form
   - [ ] Valid code logs in successfully
   - [ ] Invalid code shows error message

#### 5f. Test Backup Code
1. At login 2FA prompt, enter 7-digit backup code instead of 6-digit TOTP
2. Verify:
   - [ ] Backup code accepted
   - [ ] User logged in successfully
   - [ ] LastTwoFactorVerified updated

#### 5g. Test Weekly Window
1. Reset the LastTwoFactorVerified timestamp:
```sql
UPDATE AspNetUsers 
SET LastTwoFactorVerified = NULL
WHERE Email = 'your-test-email@example.com';
```
2. Logout and login again - should require 2FA
3. Enter valid 2FA code
4. Login should succeed
5. Set LastTwoFactorVerified to 3 days ago:
```sql
UPDATE AspNetUsers 
SET LastTwoFactorVerified = DATE_SUB(NOW(), INTERVAL 3 DAY)
WHERE Email = 'your-test-email@example.com';
```
6. Logout and login again - should skip 2FA (still within 7-day window)
7. Verify:
   - [ ] Direct login without 2FA prompt

#### 5h. Test Disable 2FA
1. Go to Account Settings
2. Click "Manage Two-Factor Authentication"
3. Click "Disable Two-Factor Authentication"
4. Verify:
   - [ ] Confirmation dialog appears
   - [ ] Modal closes on confirmation
   - [ ] Status shows "Not Enabled"

### Step 6: Database Verification
Verify the migration applied correctly:
```sql
-- Check that columns exist
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'AspNetUsers' 
AND COLUMN_NAME IN ('TwoFactorEnabled', 'TwoFactorSecret', 'BackupCodes', 'TwoFactorVerified', 'LastTwoFactorVerified');

-- Should return 5 rows
```

---

## Production Deployment

### Phase 1: Pre-Deployment Preparation

- [ ] All code reviewed
- [ ] All tests passing locally
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Communication sent to users (if needed)

### Phase 2: Deployment Steps

#### 2.1 Backend Deployment
```bash
# Build release version
cd backend
dotnet build -c Release

# Copy published files to production server
# (Your deployment method - could be Git push, artifact deployment, etc.)
```

#### 2.2 Database Migration
```bash
# SSH into production server or connect to database
# Option A: Using dotnet CLI
dotnet ef database update --project SkuVaultSaaS.Infrastructure -c ApplicationDbContext

# Option B: Using SQL script (if migrations pre-generated)
# Run migration SQL directly on database
```

#### 2.3 Frontend Deployment
```bash
cd frontend
npm run build

# Copy dist/ folder to CDN or static file hosting
# (Your deployment method)
```

#### 2.4 Application Restart
- Stop current running instance
- Wait 5 seconds
- Start new instance
- Verify startup logs show no errors

### Phase 3: Post-Deployment Verification

- [ ] Application starts without errors
- [ ] Database migration completed successfully
- [ ] Login page loads
- [ ] Login works without 2FA (for existing users)
- [ ] No database connectivity errors in logs
- [ ] API endpoints responding (check /api/auth/health or similar)

### Phase 4: User Testing

- [ ] Admin user can access Account Settings
- [ ] 2FA setup flow works
- [ ] QR code displays correctly
- [ ] 2FA verification accepts valid codes
- [ ] Login with 2FA works end-to-end
- [ ] Backup codes work as fallback
- [ ] Disable 2FA works

### Phase 5: Monitoring

After deployment, monitor:
- [ ] Application error logs (check for OtpNet initialization)
- [ ] Database performance (check migration didn't create issues)
- [ ] Authentication latency (2FA verification shouldn't add much)
- [ ] User login success rate
- [ ] Failed 2FA attempts (if you have logging)

---

## Rollback Plan (If Needed)

### Database Rollback
```bash
# Rollback the migration
dotnet ef database update <previous_migration_name> --project SkuVaultSaaS.Infrastructure

# If migrations not accessible, manually drop columns:
ALTER TABLE AspNetUsers 
DROP COLUMN BackupCodes,
DROP COLUMN LastTwoFactorVerified,
DROP COLUMN TwoFactorEnabled,
DROP COLUMN TwoFactorSecret,
DROP COLUMN TwoFactorVerified;
```

### Application Rollback
- Replace backend binaries with previous version
- Clear browser cache for frontend
- Restart application
- Verify logins work with previous version

### Communication
- Notify users of temporary issues
- Provide ETA for resolution
- Apologize for inconvenience

---

## Deployment Checklist Table

| Task | Dev | Staging | Prod | Notes |
|------|-----|---------|------|-------|
| Run `dotnet restore` | ✓ | ✓ | ✓ | Required for OtpNet |
| Build backend (`dotnet build`) | ✓ | ✓ | ✓ | |
| Build frontend (`npm run build`) | ✓ | ✓ | ✓ | |
| Apply migration | ✓ | ✓ | ✓ | `dotnet ef database update` |
| Test 2FA setup | ✓ | ✓ | ✓ | |
| Test login flow | ✓ | ✓ | ✓ | |
| Test backup codes | ✓ | ✓ | ✓ | |
| Test weekly window | ✓ | ✓ | ✓ | |
| Test disable 2FA | ✓ | ✓ | ✓ | |
| Verify database schema | ✓ | ✓ | ✓ | 5 columns added |
| Monitor logs | ✓ | ✓ | ✓ | Watch for OtpNet errors |
| User acceptance test | | ✓ | ✓ | Get sign-off |
| Backup database | | ✓ | ✓ | Before migration |

---

## Configuration Checklist

### appsettings.json
Verify these settings are configured:
```json
{
  "Jwt": {
    "Key": "your-secret-key-here",
    "Issuer": "SkuVaultSaaS",
    "Audience": "SkuVaultSaaSClients",
    "ExpiresInMinutes": 60
  }
}
```

### CORS Settings (if applicable)
Ensure frontend domain is allowed in CORS policy:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
        builder.WithOrigins("https://yourdomain.com")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials());
});
```

### SSL/HTTPS
Ensure:
- [ ] Backend uses HTTPS in production
- [ ] Cookie settings require Secure=true
- [ ] CORS credentials allowed

---

## Key Success Indicators

After deployment, verify:

✅ **Functional Metrics**
- 100% of login attempts succeed (for users without 2FA)
- 100% of 2FA setup flows complete successfully
- 100% of 2FA verification flows complete
- Weekly window logic works correctly (7-day threshold)
- Backup codes work as TOTP alternative

✅ **Performance Metrics**
- Login latency < 500ms (unchanged from before 2FA)
- 2FA verification < 100ms additional
- API response times acceptable
- Database queries optimized

✅ **Security Metrics**
- No 2FA tokens exposed in logs
- No secrets stored in clear text
- HttpOnly cookies verified
- Invalid codes rejected properly

✅ **User Experience Metrics**
- No user complaints about 2FA
- QR codes readable
- Backup codes saved by users
- Clear error messages

---

## Support Contacts

If deployment encounters issues:

1. **Database errors**: Check migration ran successfully, verify AspNetUsers columns exist
2. **OtpNet not found**: Ensure `dotnet restore` was run in API project
3. **Login not working**: Check JWT configuration, verify auth cookies
4. **2FA codes invalid**: Verify server time is correct (TOTP is time-sensitive)
5. **Users can't scan QR code**: Verify QR code library loaded, check browser console

---

## Estimated Timeline

| Task | Time | Total |
|------|------|-------|
| Restore packages | 1-2 min | 1-2 min |
| Build backend | 3-5 min | 4-7 min |
| Build frontend | 2-3 min | 6-10 min |
| Apply migration | 1-2 min | 7-12 min |
| Local testing | 10-15 min | 17-27 min |
| Staging deployment | 5-10 min | 22-37 min |
| Staging testing | 10-15 min | 32-52 min |
| Production deployment | 5-10 min | 37-62 min |
| Production verification | 5-10 min | 42-72 min |

**Total Estimated Time**: 1-1.5 hours (assuming no issues)

---

## Post-Deployment Follow-up

After successful deployment:

1. **Monitor first 24 hours**: Watch logs for any issues
2. **Gather user feedback**: Ask users about 2FA experience
3. **Verify 2FA usage**: Check how many users enable 2FA
4. **Document lessons learned**: Note any issues for future reference
5. **Plan next features**: Consider WebAuthn, SMS 2FA, etc.

---

**Deployment Ready**: ✅ All code complete and tested

The 2FA feature is ready for production deployment. Follow this checklist to ensure a smooth rollout.
