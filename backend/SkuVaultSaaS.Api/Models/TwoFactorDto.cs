namespace SkuVaultSaaS.Api.Models
{
    public class SetupTwoFactorRequest
    {
        // No properties needed - just triggers setup
    }

    public class SetupTwoFactorResponse
    {
        public string Secret { get; set; } = null!;
        public string QrCodeUri { get; set; } = null!;
        public List<string> BackupCodes { get; set; } = new();
    }

    public class VerifyTwoFactorRequest
    {
        public string Code { get; set; } = null!;
    }

    public class VerifyTwoFactorResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = null!;
        public List<string>? BackupCodes { get; set; }
    }

    public class LoginWith2FARequest
    {
        public string Code { get; set; } = null!;
    }

    public class Login2FAResponse
    {
        public bool RequiresTwoFactor { get; set; }
        public string? TempToken { get; set; }
        public string? Message { get; set; }
    }

    public class DisableTwoFactorRequest
    {
        // No properties needed
    }

    public class TwoFactorStatusResponse
    {
        public bool IsEnabled { get; set; }
        public bool IsVerified { get; set; }
        public int BackupCodesRemaining { get; set; }
    }
}
