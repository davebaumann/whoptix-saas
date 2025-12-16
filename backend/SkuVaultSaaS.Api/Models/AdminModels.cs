namespace SkuVaultSaaS.Api.Models
{
    public class AdminCustomerCreateRequest
    {
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string TenantName { get; set; } = null!;
        public string SkuVaultTenantToken { get; set; } = null!;
        public string SkuVaultUserToken { get; set; } = null!;
    }

    public class AdminCustomerUpdateRequest
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string TenantName { get; set; } = null!;
        public string SkuVaultTenantToken { get; set; } = null!;
        public string SkuVaultUserToken { get; set; } = null!;
    }

    public class AdminCustomerResponse
    {
        public int Id { get; set; }
        public string ExternalId { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public int TenantId { get; set; }
        public string TenantName { get; set; } = null!;
        public DateTime LastSyncedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class AdminCustomerListResponse
    {
        public List<AdminCustomerResponse> Customers { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class TenantCreateRequest
    {
        public string Name { get; set; } = null!;
        public string SkuVaultTenantToken { get; set; } = null!;
        public string SkuVaultUserToken { get; set; } = null!;
    }

    public class DatabaseSpecsResponse
    {
        public string DatabaseName { get; set; } = null!;
        public string DatabaseSize { get; set; } = null!;
        public long DatabaseSizeBytes { get; set; }
        public int TableCount { get; set; }
        public Dictionary<string, TableInfo> Tables { get; set; } = new();
        public DateTime LastUpdated { get; set; }
    }

    public class TableInfo
    {
        public string TableName { get; set; } = null!;
        public long RowCount { get; set; }
        public string DataSize { get; set; } = null!;
        public long DataSizeBytes { get; set; }
        public string IndexSize { get; set; } = null!;
        public long IndexSizeBytes { get; set; }
    }

    public class CreateUserRequest
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Role { get; set; } = "CustomerUser";
        public int? CustomerId { get; set; }
    }

    public class UpdateUserRequest
    {
        public string Email { get; set; } = null!;
        public string Role { get; set; } = "CustomerUser";
        public int? CustomerId { get; set; }
    }
}