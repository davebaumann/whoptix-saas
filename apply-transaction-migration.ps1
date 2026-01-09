# Manual SQL Migration for Transaction Schema Update
# This script applies the transaction schema changes directly to MySQL

param(
    [string]$Host = "justsku-db.cunciu0eq231.us-east-1.rds.amazonaws.com",
    [string]$User = "admin",
    [string]$Password = "",
    [string]$Database = "justsku_prod"
)

# If password not provided, ask for it
if ([string]::IsNullOrEmpty($Password)) {
    $securePassword = Read-Host "Enter MySQL password for user '$User'" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}

Write-Host "Connecting to $Host as $User on database $Database..." -ForegroundColor Cyan

# Define the SQL commands
$sqlCommands = @"
-- Add new columns to Transactions table
ALTER TABLE ``Transactions`` ADD COLUMN ``Code`` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE ``Transactions`` ADD COLUMN ``ScannedCode`` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE ``Transactions`` ADD COLUMN ``Title`` longtext CHARACTER SET utf8mb4 NULL;
ALTER TABLE ``Transactions`` ADD COLUMN ``ContextType`` longtext CHARACTER SET utf8mb4 NULL COMMENT 'Type of context (e.g., Sale)';
ALTER TABLE ``Transactions`` ADD COLUMN ``ContextId`` longtext CHARACTER SET utf8mb4 NULL COMMENT 'ID from context (e.g., sale ID)';

-- Drop the old flat Context column
ALTER TABLE ``Transactions`` DROP COLUMN IF EXISTS ``Context``;

-- Verify the structure
DESCRIBE ``Transactions``;
"@

# Save SQL to temp file
$tempSqlFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.sql'
$sqlCommands | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "Executing SQL migration on $Database..." -ForegroundColor Yellow

try {
    # Execute the SQL using mysql client
    # Using -p without space so password can be piped
    $mysqlPath = "mysql"
    
    # Try to find mysql in common locations if not in PATH
    if (-not (Get-Command $mysqlPath -ErrorAction SilentlyContinue)) {
        $commonPaths = @(
            "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
            "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe",
            "C:\MySQL\bin\mysql.exe"
        )
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $mysqlPath = $path
                break
            }
        }
    }

    # Execute with password
    $process = Start-Process -FilePath $mysqlPath `
        -ArgumentList "-h $Host -u $User -p$Password $Database < `"$tempSqlFile`"" `
        -NoNewWindow -Wait -PassThru -RedirectStandardOutput $null -RedirectStandardError $null

    if ($process.ExitCode -eq 0) {
        Write-Host "✓ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Apply the same migration to demo database (justsku_demo)"
        Write-Host "2. Rebuild and redeploy the Docker container"
        Write-Host "3. Re-run the sync to populate the new fields"
    }
    else {
        Write-Host "✗ Migration failed with exit code $($process.ExitCode)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Check your MySQL credentials"
        Write-Host "2. Verify the database is accessible"
        Write-Host "3. Check if any columns already exist"
    }
}
catch {
    Write-Host "Error executing migration: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Run the SQL manually:" -ForegroundColor Yellow
    Write-Host "mysql -h $Host -u $User -p < add-transaction-fields.sql"
}
finally {
    # Cleanup temp file
    if (Test-Path $tempSqlFile) {
        Remove-Item $tempSqlFile -Force
    }
}
