using System.Text.Json.Serialization;

namespace SkuVaultSaaS.Core.Enums
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum CustomerRole
    {
        Owner = 1,      // Full access, can manage users
        Admin = 2,      // Full access, can invite users
        Manager = 3,    // Can view all reports, limited settings
        Viewer = 4      // Read-only access to reports
    }
}