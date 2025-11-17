using System.Security.Cryptography;
using System.Text;

namespace SkuVaultSaaS.Api.Services
{
    public interface IEncryptionService
    {
        string Encrypt(string plainText);
        string Decrypt(string cipherText);
    }

    public class AesEncryptionService : IEncryptionService
    {
        private readonly string _key;
        private readonly byte[] _iv;

        public AesEncryptionService(IConfiguration configuration)
        {
            // Get the encryption key from configuration
            _key = configuration["Encryption:Key"] ?? throw new InvalidOperationException("Encryption key not found in configuration");
            
            // Use a fixed IV for simplicity (in production, consider using unique IVs per tenant)
            var ivString = configuration["Encryption:IV"] ?? "1234567890123456"; // 16 bytes for AES
            _iv = Encoding.UTF8.GetBytes(ivString);
        }

        public string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return plainText;

            using var aes = Aes.Create();
            aes.Key = GetValidKey(_key);
            aes.IV = _iv;

            using var encryptor = aes.CreateEncryptor();
            using var ms = new MemoryStream();
            using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
            using (var writer = new StreamWriter(cs))
            {
                writer.Write(plainText);
            }

            return Convert.ToBase64String(ms.ToArray());
        }

        public string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return cipherText;

            try
            {
                var cipherBytes = Convert.FromBase64String(cipherText);

                using var aes = Aes.Create();
                aes.Key = GetValidKey(_key);
                aes.IV = _iv;

                using var decryptor = aes.CreateDecryptor();
                using var ms = new MemoryStream(cipherBytes);
                using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
                using var reader = new StreamReader(cs);

                return reader.ReadToEnd();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to decrypt data", ex);
            }
        }

        private static byte[] GetValidKey(string key)
        {
            // AES requires a 32-byte key for AES-256
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var validKey = new byte[32];
            
            if (keyBytes.Length >= 32)
            {
                Array.Copy(keyBytes, validKey, 32);
            }
            else
            {
                Array.Copy(keyBytes, validKey, keyBytes.Length);
                // Pad with zeros if key is too short
            }
            
            return validKey;
        }
    }
}