using System.Text.Json.Serialization;

namespace SkuVaultSaaS.Api.Models
{
    /// <summary>
    /// Generic error response that hides implementation details in production
    /// </summary>
    public class ErrorResponse
    {
        [JsonPropertyName("error")]
        public string Error { get; set; } = string.Empty;

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("statusCode")]
        public int StatusCode { get; set; }

        /// <summary>
        /// Only populated in development environment
        /// </summary>
        [JsonPropertyName("details")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Details { get; set; }

        /// <summary>
        /// Only populated in development environment
        /// </summary>
        [JsonPropertyName("stackTrace")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? StackTrace { get; set; }

        public static ErrorResponse BadRequest(string message, string? details = null)
        {
            return new ErrorResponse 
            { 
                Error = "BadRequest",
                Message = message, 
                StatusCode = 400,
                Details = details
            };
        }

        public static ErrorResponse Unauthorized(string message = "Unauthorized")
        {
            return new ErrorResponse 
            { 
                Error = "Unauthorized",
                Message = message, 
                StatusCode = 401 
            };
        }

        public static ErrorResponse Forbidden(string message = "Access denied")
        {
            return new ErrorResponse 
            { 
                Error = "Forbidden",
                Message = message, 
                StatusCode = 403 
            };
        }

        public static ErrorResponse NotFound(string message = "Resource not found")
        {
            return new ErrorResponse 
            { 
                Error = "NotFound",
                Message = message, 
                StatusCode = 404 
            };
        }

        public static ErrorResponse InternalError(string message = "An error occurred", string? details = null, string? stackTrace = null)
        {
            return new ErrorResponse 
            { 
                Error = "InternalServerError",
                Message = message, 
                StatusCode = 500,
                Details = details,
                StackTrace = stackTrace
            };
        }
    }
}
