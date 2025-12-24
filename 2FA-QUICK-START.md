# 2FA Implementation - Quick Start Guide

## Status
✅ **Implementation Complete** - All backend and frontend components are in place.

⚠️ **NuGet Package Required** - The OtpNet NuGet package needs to be restored before building:
```bash
cd backend/SkuVaultSaaS.Api
dotnet restore
```

## What Was Implemented

### Backend (C# / ASP.NET Core)
1. ✅ ApplicationUser model with 2FA fields
2. ✅ TwoFactorService with TOTP generation and validation
3. ✅ AuthController endpoints for 2FA setup, verification, and login
4. ✅ Database migration to add 2FA columns
5. ✅ Dependency injection configuration
6. ✅ NuGet package reference (OtpNet 1.3.0)

### Frontend (React / TypeScript)
1. ✅ Login.tsx enhanced with 2FA form rendering
2. ✅ AccountSettings.tsx with 2FA management modal
3. ✅ TwoFactorModal component for setup and verification
4. ✅ Temporary token handling during login flow

## How to Test

### 1. Setup Phase
```bash
# Restore NuGet packages
cd backend/SkuVaultSaaS.Api
dotnet restore

# Apply migration
dotnet ef database update --project ../SkuVaultSaaS.Infrastructure

# Build and run backend
dotnet run
```

### 2. Enable 2FA on Test Account
1. Login to app as admin user
2. Navigate to Account Settings → Security
3. Click "Manage Two-Factor Authentication"
4. Modal opens with QR code and manual key
5. Scan QR code with Google Authenticator (or similar app)
6. Enter 6-digit code from app
7. System displays 10 backup codes - **SAVE THESE**

### 3. Test Weekly Verification Window
```sql
-- Simulate 7+ days have passed since last verification
UPDATE AspNetUsers 
SET LastTwoFactorVerified = DATE_SUB(NOW(), INTERVAL 8 DAY)
WHERE Email = 'your-test-email@example.com';

-- Logout and login again - should now require 2FA code
```

### 4. Test Login Flow with 2FA Required
1. Logout from application
2. Login with email/password
3. If LastTwoFactorVerified > 7 days old, you'll see 2FA form
4. Enter 6-digit code from authenticator app
5. Click Verify
6. Should redirect to dashboard

### 5. Test Backup Code
1. Set LastTwoFactorVerified to 8+ days ago (see step 3)
2. Logout and login again
3. At 2FA prompt, enter 7-digit backup code instead of TOTP
4. Should login successfully

### 6. Reset for Testing
```sql
-- Reset 2FA completely
UPDATE AspNetUsers 
SET TwoFactorEnabled = 0, 
    TwoFactorSecret = NULL, 
    TwoFactorVerified = 0, 
    BackupCodes = NULL, 
    LastTwoFactorVerified = NULL
WHERE Email = 'your-test-email@example.com';
```

## Key Endpoints

### Login (Enhanced)
```
POST /api/auth/login
Request: { email: "user@example.com", password: "..." }

Response if 2FA NOT required:
{ email: "user@example.com", expires: "...", message: "Login successful" }

Response if 2FA required:
{ 
  requiresTwoFactor: true, 
  tempToken: "jwt_token_valid_5_minutes", 
  message: "Two-factor authentication required..."
}
```

### Setup 2FA
```
POST /api/auth/2fa/setup
Authorization: Bearer {jwt_token}

Response:
{
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qrCodeUri": "otpauth://totp/...",
  "backupCodes": ["1234567", "2345678", ...]
}
```

### Verify 2FA Code
```
POST /api/auth/2fa/verify
Authorization: Bearer {jwt_token}
Content: { code: "123456" }

Response:
{
  "success": true,
  "message": "Two-factor authentication has been enabled successfully.",
  "backupCodes": ["1234567", ...]
}
```

### Complete Login with 2FA
```
POST /api/auth/login-2fa
Authorization: Bearer {tempToken}
Content: { code: "123456" }

Response:
{
  "email": "user@example.com",
  "expires": "2024-12-24T14:30:00Z",
  "message": "Login successful"
}
```

### Get 2FA Status
```
GET /api/auth/2fa/status
Authorization: Bearer {jwt_token}

Response:
{
  "isEnabled": true,
  "isVerified": true,
  "backupCodesRemaining": 8
}
```

### Disable 2FA
```
POST /api/auth/2fa/disable
Authorization: Bearer {jwt_token}

Response:
{ success: true, message: "Two-factor authentication has been disabled." }
```

## Testing Authenticator Apps

Any TOTP-compatible authenticator app will work:
- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android) - Recommended (backup to cloud)
- **1Password** (iOS/Android)
- **LastPass Authenticator** (iOS/Android)

## Common Issues & Solutions

### "OtpNet not found" Error
**Solution**: Run `dotnet restore` in the API project folder

### Invalid Code During 2FA
**Issue**: Device time is out of sync
**Solution**: Check device time is correct (TOTP is time-sensitive, within 30-second window)

### Can't Remember 2FA Codes
**Issue**: Lost authenticator app or device
**Solution**: Use saved backup codes (7-digit codes saved during setup)
**If no backup codes left**: Admin must reset user's 2FA

### Login Still Works Without 2FA
**Issue**: LastTwoFactorVerified is within 7 days
**Solution**: 
```sql
UPDATE AspNetUsers 
SET LastTwoFactorVerified = NULL
WHERE Email = 'user@example.com';
```

## Architecture Decisions

1. **Weekly Verification Instead of Every Login**
   - Better UX: Users don't need to enter code on every login
   - Still secure: Verification required at least once per week
   - Balances security with usability

2. **Backup Codes**
   - 10 codes, single-use each
   - Users should save/print them during setup
   - No way to regenerate without re-enabling 2FA
   - Provides recovery option if device is lost

3. **Temporary Tokens**
   - 5-minute expiry for 2FA verification
   - Limits attack window if password compromised
   - User must be fast (reasonable for human interaction)

4. **HttpOnly Cookies**
   - JWT stored in secure, httpOnly cookies
   - Prevents XSS attacks from accessing token
   - Automatically sent with requests

## Files Modified/Created

### Backend
- ✅ `SkuVaultSaaS.Api/Controllers/AuthController.cs` - Enhanced with 2FA endpoints
- ✅ `SkuVaultSaaS.Api/Services/TwoFactorService.cs` - TOTP service (NEW)
- ✅ `SkuVaultSaaS.Api/Models/TwoFactorDto.cs` - DTOs (NEW)
- ✅ `SkuVaultSaaS.Api/Program.cs` - Dependency injection
- ✅ `SkuVaultSaaS.Api/SkuVaultSaaS.Api.csproj` - OtpNet package added
- ✅ `SkuVaultSaas.Core/Models/ApplicationUser.cs` - New 2FA fields
- ✅ `SkuVaultSaaS.Infrastructure/Migrations/20251224000000_Add2FA.cs` - Database migration (NEW)

### Frontend
- ✅ `frontend/src/pages/Login.tsx` - 2FA form and flow
- ✅ `frontend/src/pages/AccountSettings.tsx` - 2FA management modal

## Next Steps

1. **Restore NuGet**: `dotnet restore` in API project
2. **Apply Migration**: `dotnet ef database update`
3. **Build Backend**: `dotnet build`
4. **Test Setup Flow**: Enable 2FA on test account
5. **Test Login Flow**: Logout, login, verify 2FA prompt
6. **Test Backup Code**: Use 7-digit code during login
7. **Deploy**: Build and deploy when satisfied with testing

## Questions?

Refer to the detailed documentation in `2FA-IMPLEMENTATION-SUMMARY.md` for:
- Complete API endpoint documentation
- Security considerations
- User flow diagrams
- Database schema details
- Troubleshooting guide
