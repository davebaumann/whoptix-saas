using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace SkuVaultSaaS.Api.Services
{
    public interface ITwoFactorService
    {
        (string Secret, string QrCodeUri) GenerateTwoFactorSecret(string email);
        bool VerifyCode(string secret, string code);
        List<string> GenerateBackupCodes(int count = 10);
        bool UseBackupCode(List<string> backupCodes, string code);
    }

    public class TwoFactorService : ITwoFactorService
    {
        private const int TimeStep = 30;
        private const int CodeLength = 6;
        private const string Issuer = "SkuVault";

        public (string Secret, string QrCodeUri) GenerateTwoFactorSecret(string email)
        {
            // Generate random 20-byte secret
            var secretBytes = new byte[20];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(secretBytes);
            }

            // Encode as base32
            var base32Secret = Base32Encode(secretBytes);

            // Create QR code URI
            var qrCodeUri = $"otpauth://totp/{Issuer}%20({email})?secret={base32Secret}&issuer={Issuer}&algorithm=SHA1&digits=6&period={TimeStep}";

            return (base32Secret, qrCodeUri);
        }

        public bool VerifyCode(string secret, string code)
        {
            try
            {
                if (string.IsNullOrEmpty(secret) || string.IsNullOrEmpty(code) || code.Length != CodeLength)
                    return false;

                if (!int.TryParse(code, out var codeInt))
                    return false;

                // Decode base32 secret
                var secretBytes = Base32Decode(secret);
                if (secretBytes == null)
                    return false;

                // Check current and previous time windows
                var timeCounter = (long)(DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1))).TotalSeconds / TimeStep;

                // Check current, previous, and next time window for flexibility
                for (int i = -1; i <= 1; i++)
                {
                    var testCounter = timeCounter + i;
                    if (VerifyTotp(secretBytes, testCounter, codeInt))
                        return true;
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        private bool VerifyTotp(byte[] key, long timeCounter, int code)
        {
            var message = BitConverter.GetBytes(timeCounter);
            if (BitConverter.IsLittleEndian)
                Array.Reverse(message);

            using (var hmac = new HMACSHA1(key))
            {
                var hash = hmac.ComputeHash(message);
                var offset = hash[hash.Length - 1] & 0x0f;
                var truncatedHash = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);

                var totp = truncatedHash % (int)Math.Pow(10, CodeLength);
                return totp == code;
            }
        }

        public List<string> GenerateBackupCodes(int count = 10)
        {
            var codes = new List<string>();
            using (var rng = RandomNumberGenerator.Create())
            {
                for (int i = 0; i < count; i++)
                {
                    var buffer = new byte[4];
                    rng.GetBytes(buffer);
                    var code = Math.Abs(BitConverter.ToInt32(buffer, 0)) % 10000000;
                    codes.Add(code.ToString("D7"));
                }
            }

            return codes;
        }

        public bool UseBackupCode(List<string> backupCodes, string code)
        {
            if (backupCodes == null || !backupCodes.Contains(code))
                return false;

            backupCodes.Remove(code);
            return true;
        }

        private static string Base32Encode(byte[] data)
        {
            const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            var bits = "";
            foreach (var b in data)
            {
                bits += Convert.ToString(b, 2).PadLeft(8, '0');
            }

            var result = "";
            for (int i = 0; i < bits.Length; i += 5)
            {
                var chunk = bits.Substring(i, Math.Min(5, bits.Length - i)).PadRight(5, '0');
                result += alphabet[Convert.ToInt32(chunk, 2)];
            }

            return result;
        }

        private static byte[] Base32Decode(string input)
        {
            try
            {
                const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
                var bits = "";

                foreach (var c in input)
                {
                    var index = alphabet.IndexOf(char.ToUpper(c));
                    if (index < 0)
                        return null;
                    bits += Convert.ToString(index, 2).PadLeft(5, '0');
                }

                var data = new List<byte>();
                for (int i = 0; i < bits.Length; i += 8)
                {
                    var chunk = bits.Substring(i, Math.Min(8, bits.Length - i)).PadRight(8, '0');
                    data.Add(Convert.ToByte(chunk, 2));
                }

                return data.ToArray();
            }
            catch
            {
                return null;
            }
        }
    }
}
