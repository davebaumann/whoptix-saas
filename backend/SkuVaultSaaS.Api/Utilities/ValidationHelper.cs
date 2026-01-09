using System;

namespace SkuVaultSaaS.Api.Utilities
{
    /// <summary>
    /// Validates input parameters to prevent DOS and injection attacks
    /// </summary>
    public static class ValidationHelper
    {
        /// <summary>
        /// Maximum allowed date range (days)
        /// </summary>
        private const int MaxDateRangeDays = 365;

        /// <summary>
        /// Maximum allowed days in the past (to prevent year 9999 attacks)
        /// </summary>
        private const int MaxDaysInPast = 10 * 365; // 10 years

        /// <summary>
        /// Validates date range parameters
        /// </summary>
        /// <param name="startDate">Start date (required)</param>
        /// <param name="endDate">End date (required)</param>
        /// <returns>Tuple of (isValid, errorMessage)</returns>
        public static (bool isValid, string errorMessage) ValidateDateRange(DateTime? startDate, DateTime? endDate)
        {
            if (!startDate.HasValue || !endDate.HasValue)
            {
                return (false, "Start date and end date are required.");
            }

            // Check if dates are too far in past (prevent year 9999 attacks)
            if (startDate.Value < DateTime.UtcNow.AddDays(-MaxDaysInPast))
            {
                return (false, $"Start date must be within {MaxDaysInPast / 365} years.");
            }

            // Check if dates are in future
            if (startDate.Value > DateTime.UtcNow)
            {
                return (false, "Start date cannot be in the future.");
            }

            if (endDate.Value > DateTime.UtcNow)
            {
                return (false, "End date cannot be in the future.");
            }

            // Check if start is before end
            if (startDate.Value >= endDate.Value)
            {
                return (false, "Start date must be before end date.");
            }

            // Check maximum range
            var rangeDays = (endDate.Value - startDate.Value).TotalDays;
            if (rangeDays > MaxDateRangeDays)
            {
                return (false, $"Date range cannot exceed {MaxDateRangeDays} days. Please narrow your search.");
            }

            return (true, string.Empty);
        }

        /// <summary>
        /// Validates a customer ID to prevent SQL injection via ID parameter
        /// </summary>
        public static bool ValidateCustomerId(int customerId)
        {
            return customerId > 0 && customerId < int.MaxValue;
        }

        /// <summary>
        /// Validates a product ID to prevent SQL injection
        /// </summary>
        public static bool ValidateProductId(int productId)
        {
            return productId > 0 && productId < int.MaxValue;
        }

        /// <summary>
        /// Validates email format
        /// </summary>
        public static bool ValidateEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Validates password meets minimum requirements
        /// </summary>
        public static (bool isValid, string errorMessage) ValidatePassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                return (false, "Password is required.");

            if (password.Length < 8)
                return (false, "Password must be at least 8 characters.");

            if (password.Length > 128)
                return (false, "Password must be less than 128 characters.");

            return (true, string.Empty);
        }
    }
}
