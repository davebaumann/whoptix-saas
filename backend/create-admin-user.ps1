# PowerShell Script to Create Admin User in Production RDS
# Usage: .\create-admin-user.ps1 -Email "admin@justsku.com" -Password "SecurePassword123!"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$true)]
    [string]$Password,
    
    [string]$RdsHost = "justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com",
    [string]$Database = "justsku_prod",
    [string]$RdsUser = "admin",
    [string]$RdsPassword = (Read-Host -Prompt "Enter RDS password" -AsSecureString | ConvertFrom-SecureString -AsPlainText),
    [int]$Port = 3306
)

# Load required .NET assemblies for password hashing
Add-Type -AssemblyName "System.Security.Cryptography"
Add-Type -Path "$PSScriptRoot\..\..\node_modules\aspnet-core-password-hasher\lib\*"

# MySQL connection
function Get-MySqlConnection {
    param(
        [string]$Host,
        [string]$Database,
        [string]$User,
        [string]$Password,
        [int]$Port
    )
    
    try {
        # Install MySQL connector if not present
        $mysqlPath = "C:\Program Files\MySQL\MySQL Connector Net\Assemblies\v4.5.2\MySql.Data.dll"
        if (-Not (Test-Path $mysqlPath)) {
            Write-Host "Installing MySQL.Data NuGet package..."
            # Using direct DLL load approach instead
            $connector = "MySql.Data, Version=8.0.33.0, Culture=neutral, PublicKeyToken=c5687fc88969c44d"
        }
        
        Add-Type -AssemblyName MySql.Data
        $connStr = "Server=$Host;Port=$Port;Database=$Database;User=$User;Password=$Password;SSL Mode=None;"
        $conn = New-Object MySql.Data.MySqlClient.MySqlConnection($connStr)
        $conn.Open()
        return $conn
    }
    catch {
        Write-Error "Failed to connect to MySQL: $_"
        exit 1
    }
}

# Generate password hash using PBKDF2 (ASP.NET Core Identity default)
function Get-PasswordHash {
    param(
        [string]$Password
    )
    
    # Use PBKDF2 with 10,000 iterations (ASP.NET Core Identity v6 default)
    $salt = [byte[]]::new(16)
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($salt)
    
    $pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($Password, $salt, 10000, "SHA256")
    $hash = $pbkdf2.GetBytes(32)
    
    # ASP.NET Identity format: 0x00 + version (0x03) + algorithm (1=PBKDF2-SHA256) + iteration count (4 bytes) + salt (16 bytes) + hash (32 bytes)
    $hashBytes = @(0x00, 0x03, 0x00) + [BitConverter]::GetBytes([uint32]10000) + $salt + $hash
    
    # Return Base64 encoded hash in ASP.NET format
    return "AQAAAAIAAAAyAAAAEO" + [Convert]::ToBase64String($hashBytes)
}

# Simpler approach: Use bcrypt for password hashing
function Get-BcryptHash {
    param(
        [string]$Password
    )
    
    # For production, we'll use a simple PBKDF2 implementation
    # Since bcrypt requires additional libraries, we'll use the format below
    # This is compatible with ASP.NET Core's PasswordHasher
    
    # Actually, let's use a different approach - call a .NET Core tool
    Write-Host "Generating password hash..."
    
    # Create a temporary C# file to hash the password
    $hashScript = @"
using System;
using Microsoft.AspNetCore.Identity;

var hasher = new PasswordHasher<object>();
var hash = hasher.HashPassword(null, "$Password");
Console.WriteLine(hash);
"@
    
    # For now, return a placeholder - in production you'd compile and run this
    # Alternative: use the API endpoint approach instead
    return ""
}

# Main execution
Write-Host "Creating admin user in production..."
Write-Host "Email: $Email"

# Normalize email
$normalizedEmail = $Email.ToUpper()
$normalizedUserName = $Email.ToUpper()

# Generate UUID for user
$userId = [System.Guid]::NewGuid().ToString()

Write-Host "Generated User ID: $userId"

# Try connection
$conn = Get-MySqlConnection -Host $RdsHost -Database $Database -User $RdsUser -Password $RdsPassword -Port $Port

if ($conn.State -eq "Open") {
    Write-Host "✓ Connected to RDS successfully"
    
    # Check if user already exists
    $checkCmd = $conn.CreateCommand()
    $checkCmd.CommandText = "SELECT COUNT(*) FROM AspNetUsers WHERE NormalizedEmail = @email"
    $checkCmd.Parameters.AddWithValue("@email", $normalizedEmail) | Out-Null
    $exists = $checkCmd.ExecuteScalar()
    
    if ($exists -gt 0) {
        Write-Error "User with email $Email already exists!"
        $conn.Close()
        exit 1
    }
    
    # Hash password - using simple approach for demo
    # In production, you should use a proper password hasher
    Write-Host "⚠️  WARNING: This script requires manual password hashing."
    Write-Host "Recommended approach: Use the application's UserManager API instead."
    Write-Host ""
    Write-Host "Option 1: Run this migration-based approach (automatic on app startup)"
    Write-Host "Option 2: Call an API endpoint if available"
    Write-Host "Option 3: Use dotnet CLI to run a seeding tool"
    
    $conn.Close()
    exit 1
} else {
    Write-Error "Failed to open database connection"
    exit 1
}
