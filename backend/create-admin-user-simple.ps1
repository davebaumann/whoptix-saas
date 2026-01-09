# Simple approach: Create admin user via API call
# Usage: .\create-admin-user-simple.ps1

param(
    [string]$ApiUrl = "https://api.justsku.com",
    [string]$AdminEmail = "admin@justsku.com",
    [string]$AdminPassword = (Read-Host -Prompt "Enter admin password" -AsSecureString | ConvertFrom-SecureString -AsPlainText)
)

Write-Host "Attempting to create admin user via API..."
Write-Host "API URL: $ApiUrl"
Write-Host "Email: $AdminEmail"

# First, check if user already exists by trying to login
$loginPayload = @{
    email = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginPayload `
        -SkipHttpErrorCheck
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Admin user already exists and login successful!"
        exit 0
    }
} catch {
    Write-Host "Login check failed (expected if user doesn't exist)"
}

# If no API endpoint, use database migration approach
Write-Host ""
Write-Host "⚠️ No signup/admin creation API endpoint found."
Write-Host ""
Write-Host "RECOMMENDED SOLUTION:"
Write-Host "Create an Entity Framework migration that seeds the admin user."
Write-Host ""
Write-Host "Run this command from the backend directory:"
Write-Host "  dotnet ef migrations add AddAdminUser --project SkuVaultSaaS.Infrastructure"
Write-Host ""
Write-Host "Then edit the migration file to add this code in the 'Up' method:"
Write-Host ""
Write-Host @"
// This will be replaced with actual hashed password
migrationBuilder.InsertData(
    table: "AspNetUsers",
    columns: new[] { "Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail", "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp", "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount", "CustomerRole" },
    values: new object[] { 
        Guid.NewGuid().ToString(), 
        "$AdminEmail", 
        "$AdminEmail".ToUpper(), 
        "$AdminEmail", 
        "$AdminEmail".ToUpper(), 
        true, 
        null, // Will be set by Program.cs seeding
        Guid.NewGuid().ToString(), 
        Guid.NewGuid().ToString(), 
        false, 
        false, 
        true, 
        0, 
        0 
    }
);

// Assign Admin role
migrationBuilder.InsertData(
    table: "AspNetRoles",
    columns: new[] { "Id", "Name", "NormalizedName" },
    values: new object[] { Guid.NewGuid().ToString(), "Admin", "ADMIN" }
);
"@
