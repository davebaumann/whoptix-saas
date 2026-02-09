-- SQL to create the Integrations table
CREATE TABLE IF NOT EXISTS Integrations (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    TenantId INT NOT NULL,
    SkuVaultId VARCHAR(50) NOT NULL,
    SkuVaultLongId VARCHAR(100),
    Name VARCHAR(255) NOT NULL,
    Type VARCHAR(100) NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    RowVersion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (TenantId) REFERENCES Tenants(Id) ON DELETE CASCADE,
    UNIQUE KEY unique_tenant_skuvault_id (TenantId, SkuVaultId),
    INDEX idx_tenant_id (TenantId),
    INDEX idx_type (Type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add the DbSet to ApplicationDbContext in Data/ApplicationDbContext.cs
-- Add this line to the DbContext class:
-- public DbSet<Integration> Integrations { get; set; }
