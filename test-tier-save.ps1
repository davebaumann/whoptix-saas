# Test the tier configuration save endpoint
# Replace with your actual API URL
$apiUrl = "https://your-api-url.com/api/membership/admin/report-access-config"

# Test configuration data
$testConfig = @{
    "inventory" = 1
    "low-stock" = 2
    "aging-inventory" = 3
    "financial-warehouse" = 3
    "locations" = 3
    "performance" = 4
}

$jsonBody = $testConfig | ConvertTo-Json

Write-Host "Testing POST to: $apiUrl" -ForegroundColor Yellow
Write-Host "Body: $jsonBody" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $jsonBody -ContentType "application/json"
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json) -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}