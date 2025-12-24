# Two-Factor Authentication (2FA) Implementation Summary

## Overview
A comprehensive 2FA system has been implemented for SkuVaultSaaS using Time-based One-Time Password (TOTP) technology with optional weekly verification windows and backup codes for account recovery.

## Key Features
- ✅ **TOTP-Based Authentication**: RFC 6238 compliant using the OtpNet library
- ✅ **Optional but Flexible**: Users can enable 2FA, with verification required only once per week instead of every login
- ✅ **Backup Codes**: 10 auto-generated backup codes for account recovery if authenticator is lost
- ✅ **QR Code Setup**: Mobile authenticator apps scan QR code during setup
- ✅ **Seamless Login Flow**: Users prompted for 2FA code only when verification window has expired (>7 days)
- ✅ **Temporary Tokens**: 5-minute temporary tokens secure the 2FA verification process

## Architecture

### Backend Components

#### 1. **Database Schema Changes** (`20251224000000_Add2FA.cs`)
```sql
ALTER TABLE AspNetUsers ADD COLUMN BackupCodes JSON NULL;
ALTER TABLE AspNetUsers ADD COLUMN LastTwoFactorVerified DATETIME NULL;
ALTER TABLE AspNetUsers ADD COLUMN TwoFactorEnabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE AspNetUsers ADD COLUMN TwoFactorSecret VARCHAR(255) NULL;
ALTER TABLE AspNetUsers ADD COLUMN TwoFactorVerified TINYINT(1) NOT NULL DEFAULT 0;
```

#### 2. **ApplicationUser Model** (`SkuVaultSaas.Core/Models/ApplicationUser.cs`)
New properties added:
- `TwoFactorEnabled` (bool): Flag indicating if 2FA is active
- `TwoFactorSecret` (string): Base32-encoded TOTP secret
- `TwoFactorVerified` (bool): Flag indicating completion of 2FA setup
- `BackupCodes` (List<string>): List of unused backup codes
- `LastTwoFactorVerified` (DateTime?): Timestamp of last successful 2FA verification

#### 3. **TwoFactorService** (`SkuVaultSaaS.Api/Services/TwoFactorService.cs`)
```csharp
public interface ITwoFactorService
{
    (string Secret, string QrCodeUri) GenerateTwoFactorSecret(string email);
    bool VerifyCode(string secret, string code);
    List<string> GenerateBackupCodes(int count = 10);
    bool UseBackupCode(List<string> codes, string code);
}
```

**Methods:**
- `GenerateTwoFactorSecret()`: Generates TOTP secret key and QR code URI
  - Uses OtpNet's KeyGeneration to create cryptographically secure 20-byte key
  - Returns Base32-encoded secret and QR code URI
  
- `VerifyCode()`: Validates 6-digit TOTP codes
  - Implements RFC 6238 with ±1 time window for clock drift tolerance
  - Uses SHA1 hashing, 30-second time step
  
- `GenerateBackupCodes()`: Creates 10 random 7-digit codes
  - Used for account recovery if authenticator device is lost
  
- `UseBackupCode()`: Validates and removes a backup code from the list
  - Prevents reuse of backup codes

#### 4. **AuthController Endpoints** (`SkuVaultSaaS.Api/Controllers/AuthController.cs`)

**POST `/api/auth/login`** (Enhanced)
```csharp
// Behavior:
if (user has 2FA enabled && last verification > 7 days old)
{
    return Login2FAResponse { 
        RequiresTwoFactor = true, 
        TempToken = "5-min token", 
        Message = "2FA required"
    }
}
else
{
    return full JWT token and set httpOnly cookie
}
```

**POST `/api/auth/2fa/setup`** [Authorize]
- Generates TOTP secret and QR code
- Returns to frontend for user to scan with authenticator app
- Response: `SetupTwoFactorResponse`
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qrCodeUri": "otpauth://totp/...",
  "backupCodes": ["1234567", "2345678", ...]
}
```

**POST `/api/auth/2fa/verify`** [Authorize]
- User submits 6-digit code from authenticator app
- Validates code using TwoFactorService
- Enables 2FA on account
- Sets `LastTwoFactorVerified = DateTime.UtcNow`
- Response includes backup codes
```json
{
  "success": true,
  "message": "Two-factor authentication enabled",
  "backupCodes": ["1234567", ...]
}
```

**POST `/api/auth/login-2fa`** [AllowAnonymous + Temp Token]
- Called after initial password validation if 2FA is required
- Accepts 6-digit TOTP code OR 7-digit backup code
- Uses temporary token to identify user (without full auth)
- Updates `LastTwoFactorVerified = DateTime.UtcNow` on success
- Returns full JWT token and sets httpOnly cookie
```json
{
  "email": "user@example.com",
  "expires": "2024-12-24T14:30:00Z",
  "message": "Login successful"
}
```

**POST `/api/auth/2fa/disable`** [Authorize]
- Removes all 2FA data from user account
- Clears `TwoFactorEnabled`, `TwoFactorSecret`, `BackupCodes`, `LastTwoFactorVerified`

**GET `/api/auth/2fa/status`** [Authorize]
- Returns current 2FA configuration
```json
{
  "isEnabled": true,
  "isVerified": true,
  "backupCodesRemaining": 8
}
```

#### 5. **DTOs** (`SkuVaultSaaS.Api/Models/TwoFactorDto.cs`)
- `SetupTwoFactorRequest`: Empty (triggers generation)
- `SetupTwoFactorResponse`: Secret, QR code URI, backup codes
- `VerifyTwoFactorRequest`: 6-digit code
- `VerifyTwoFactorResponse`: Success status, message, backup codes
- `LoginWith2FARequest`: 6-digit code
- `Login2FAResponse`: RequiresTwoFactor flag, temporary token, message
- `DisableTwoFactorRequest`: Empty
- `TwoFactorStatusResponse`: Enabled, verified status, backup codes remaining

#### 6. **Dependency Injection** (`Program.cs`)
```csharp
builder.Services.AddScoped<ITwoFactorService, TwoFactorService>();
```

#### 7. **NuGet Dependencies** (`SkuVaultSaaS.Api.csproj`)
```xml
<PackageReference Include="OtpNet" Version="1.3.0" />
```

### Frontend Components

#### 1. **Login Page** (`frontend/src/pages/Login.tsx`)
Dual-form interface:

**Initial Form (Email + Password)**
```tsx
- Email input field
- Password input field
- Sign in button
- Error display
- Loading spinner during submission
```

**2FA Form (When 2FA is Required)**
```tsx
- 6-digit code input field
  - Input masked as numbers only
  - Auto-formats as user types
  - Disables submit button until 6 digits entered
- Back button to return to password form
- Verify button to submit code
- Error display with helpful messages
- Completion redirects to dashboard/admin based on user role
```

**Flow Logic:**
1. User enters email/password
2. `handleSubmit()` calls `/api/auth/login`
3. If response contains `requiresTwoFactor: true`:
   - Store `tempToken` from response
   - Switch UI to 2FA form
4. User enters 6-digit code
5. `handleTwoFactorSubmit()` calls `/api/auth/login-2fa` with:
   - Authorization header: `Bearer {tempToken}`
   - Body: `{ code: "123456" }`
6. Backend validates code, updates `LastTwoFactorVerified`, returns JWT
7. Frontend redirects to dashboard

#### 2. **Account Settings Modal** (`frontend/src/pages/AccountSettings.tsx`)
Added two-factor authentication management section:

**TwoFactorModal Component**
- **Step 1: Display QR Code**
  - Shows QR code image
  - Displays Base32-encoded secret for manual entry
  - User scans with authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
  
- **Step 2: Verify Code**
  - User enters 6-digit code from app
  - System validates code
  - Displays 10 backup codes with copy-to-clipboard functionality
  - Shows success message

**Security Section**
- Change Password button → Modal
- Manage 2FA button → Modal
- Current 2FA status display (enabled/disabled)
- Number of remaining backup codes

### API Integration

#### Authentication Headers
All 2FA endpoints use standard JWT authentication:
```
Authorization: Bearer {jwt_token}
```

Temporary tokens for 2FA verification include special claim:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "temp_auth": "2fa_verification",
  "exp": 1735067400  // 5 minutes from issue
}
```

#### Error Handling
- Invalid code: `400 Bad Request` with message "Invalid verification code or backup code"
- Code expired: `400 Bad Request` with message "Code has expired"
- 2FA not enabled: `400 Bad Request` with message "2FA is not enabled for this account"
- Unauthorized: `401 Unauthorized` if temporary token is invalid

## Security Considerations

### Strengths
✅ **Time-Based OTP (RFC 6238)**: Industry-standard TOTP implementation
✅ **±1 Time Window**: Tolerates minor clock drift on mobile devices
✅ **Backup Codes**: Single-use codes for account recovery
✅ **Secure Token Generation**: Cryptographically secure random keys
✅ **Temporary Tokens**: 5-minute expiry limits window for 2FA attacks
✅ **HttpOnly Cookies**: JWT stored in secure, httpOnly cookies (prevents XSS access)
✅ **Weekly Verification**: Balances security with UX (users not overwhelmed)

### Considerations
⚠️ **Code Validity**: TOTP codes are valid for 60 seconds + 30 seconds before/after
⚠️ **Backup Code Management**: Users must save backup codes securely
⚠️ **Device Synchronization**: TOTP relies on device time being reasonably accurate
⚠️ **Recovery Codes**: If user loses both authenticator and backup codes, account recovery requires admin intervention

## User Flow Example

### Setup Flow
```
1. User navigates to Account Settings
2. Clicks "Manage Two-Factor Authentication"
3. Modal opens showing QR code
4. User scans QR code with authenticator app (Google Authenticator, etc.)
5. User enters 6-digit code from app
6. System validates code
7. Backup codes displayed for saving/printing
8. 2FA enabled on account
```

### Login Flow (2FA Enabled, >7 Days Since Last Verification)
```
1. User enters email: test@example.com
2. User enters password: ••••••••
3. System validates credentials
4. System checks: 2FA enabled? Yes. Last verified >7 days? Yes.
5. System returns Login2FAResponse with requiresTwoFactor=true
6. Frontend switches to 2FA form
7. User enters code: 123456 (from authenticator app)
8. Frontend submits to /api/auth/login-2fa with temporary token
9. System validates TOTP code
10. System updates LastTwoFactorVerified to current time
11. System returns JWT token
12. Frontend redirects to dashboard
```

### Login Flow (2FA Enabled, <7 Days Since Last Verification)
```
1. User enters email: test@example.com
2. User enters password: ••••••••
3. System validates credentials
4. System checks: 2FA enabled? Yes. Last verified >7 days? No.
5. System returns JWT token immediately (skips 2FA)
6. Frontend redirects to dashboard
7. User is logged in without 2FA code prompt
```

### Backup Code Flow
```
1. User lost authenticator device
2. During login, tries to use backup code instead of TOTP
3. User enters 7-digit backup code (e.g., 1234567)
4. System matches code against BackupCodes list
5. System removes used code from list
6. System logs user in
7. System updates LastTwoFactorVerified
8. User should immediately regenerate 2FA with new backup codes
```

## Testing Checklist

### Backend Testing
- [ ] Create new user, enable 2FA, verify backup codes generated
- [ ] Test TOTP validation with correct code
- [ ] Test TOTP validation with incorrect code
- [ ] Test backup code usage (valid and invalid)
- [ ] Test 7-day window logic:
  - [ ] Fresh login without LastTwoFactorVerified should require 2FA
  - [ ] Login within 7 days should skip 2FA
  - [ ] Login after 7 days should require 2FA
- [ ] Test temporary token expiration (should be 5 minutes)
- [ ] Test disabling 2FA clears all data

### Frontend Testing
- [ ] 2FA setup modal displays QR code correctly
- [ ] QR code can be scanned by authenticator app
- [ ] 2FA verification modal accepts 6-digit code
- [ ] Invalid code shows error message
- [ ] Login flow correctly handles Login2FAResponse
- [ ] 2FA form displays when requiresTwoFactor=true
- [ ] Back button returns to password form
- [ ] After successful 2FA, redirects to dashboard
- [ ] Status display shows correct backup code count

### Integration Testing
- [ ] Full setup → logout → login → 2FA → dashboard flow
- [ ] Backup code usage during login
- [ ] Disable 2FA and verify login works without 2FA
- [ ] Re-enable 2FA after disabling

## Deployment Steps

1. **Restore NuGet Packages**
   ```bash
   cd backend
   dotnet restore
   ```

2. **Apply Database Migration**
   ```bash
   dotnet ef database update --project SkuVaultSaaS.Infrastructure
   ```

3. **Build Backend**
   ```bash
   dotnet build
   ```

4. **Build Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

5. **Deploy and Restart**
   - Deploy new backend binaries
   - Deploy new frontend assets
   - Restart application

## Future Enhancements

- [ ] WebAuthn/FIDO2 support for hardware keys
- [ ] SMS-based OTP as fallback
- [ ] Email-based OTP for recovery
- [ ] Admin ability to reset user's 2FA
- [ ] Audit logs for 2FA events
- [ ] Option to require 2FA for all users (org-wide policy)
- [ ] Custom verification window (not just 7 days)
- [ ] Backup code regeneration without disabling 2FA

## Troubleshooting

### "Invalid verification code" during login
- **Cause**: System time on device is out of sync
- **Solution**: Verify device time is correct; TOTP is time-sensitive

### "Code has expired"
- **Cause**: User took too long to enter code (>30 seconds)
- **Solution**: Generate new code from authenticator app (refreshes every 30 seconds)

### Backup codes showing as invalid
- **Cause**: Whitespace or formatting issues
- **Solution**: Ensure exact 7-digit code is entered without spaces

### Lost authenticator device
- **Solution**: Use one of the saved backup codes to login, then disable/re-enable 2FA
- **If all backup codes used**: Contact administrator for account recovery

## References

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [OtpNet Library](https://github.com/deapsquatter/OtpNet)
- [NIST Authentication Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
