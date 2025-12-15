# Test script for tier configuration save functionality
# Run this after restarting the API with the fixes

Write-Host "Testing Tier Configuration Save Functionality" -ForegroundColor Green

# Test data - sample report access configuration
$testConfig = @{
    "inventory" = 1
    "low-stock" = 2
    "aging-inventory" = 3
    "financial-warehouse" = 3
    "locations" = 3
    "performance" = 4
}

# Convert to JSON
$jsonBody = $testConfig | ConvertTo-Json

Write-Host "Test configuration:" -ForegroundColor Yellow
Write-Host $jsonBody

# Test the endpoint (assuming API is running on localhost:5000)
$apiUrl = "http://localhost:5000/api/membership/admin/report-access-config"

try {
    Write-Host "`nTesting POST to $apiUrl" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $jsonBody -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "SUCCESS: Configuration saved successfully!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERROR: Failed to save configuration" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`nTest completed. Check the API logs for more details." -ForegroundColor Green