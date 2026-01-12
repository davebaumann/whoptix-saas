namespace SkuVaultSaaS.Core.Services
{
    /// <summary>
    /// Service for encrypting and decrypting sensitive data using ASP.NET Core's Data Protection API
    /// </summary>
    public interface IEncryptionService
    {
        /// <summary>
        /// Encrypts a plaintext string
        /// </summary>
        /// <param name="plaintext">The plaintext to encrypt</param>
        /// <returns>Encrypted string, or null if input is null/empty</returns>
        string? Encrypt(string? plaintext);

        /// <summary>
        /// Decrypts an encrypted string
        /// </summary>
        /// <param name="encrypted">The encrypted string</param>
        /// <returns>Plaintext string, or null if input is null/empty</returns>
        string? Decrypt(string? encrypted);
    }
}
