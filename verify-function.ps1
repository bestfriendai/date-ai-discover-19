# PowerShell script to verify the search-events-unified function

Write-Host "Verifying search-events-unified function..." -ForegroundColor Green

# Check if all required files exist
$requiredFiles = @(
    "supabase/functions/search-events-unified/index.ts",
    "supabase/functions/search-events-unified/ticketmaster.ts",
    "supabase/functions/search-events-unified/predicthq.ts",
    "supabase/functions/search-events-unified/types.ts",
    "supabase/functions/search-events-unified/deno.json",
    "supabase/functions/search-events-unified/README.md",
    "supabase/functions/import_map.json",
    "test-unified-function.js",
    "test-local-function.js",
    "deploy-unified-function.ps1"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file does not exist" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "Some required files are missing!" -ForegroundColor Red
    exit 1
}

# Check if the function can be deployed
Write-Host "`nChecking if the function can be deployed..." -ForegroundColor Yellow

# Check if node-fetch is installed
$nodeFetchInstalled = $false
try {
    $packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.dependencies.'node-fetch') {
        $nodeFetchInstalled = $true
        Write-Host "✓ node-fetch is listed in package.json" -ForegroundColor Green
    } else {
        Write-Host "✗ node-fetch is not listed in package.json" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Could not read package.json" -ForegroundColor Yellow
}

# Provide instructions for testing and deployment
Write-Host "`nVerification completed!" -ForegroundColor Green
Write-Host "`nTo test the function locally:" -ForegroundColor Cyan
Write-Host "1. Install node-fetch: npm install node-fetch@2" -ForegroundColor White
Write-Host "2. Run the test script: node test-local-function.js" -ForegroundColor White

Write-Host "`nTo deploy the function to Supabase:" -ForegroundColor Cyan
Write-Host "1. Run the deployment script: ./deploy-unified-function.ps1" -ForegroundColor White
Write-Host "2. Or manually create a zip file and upload it through the Supabase dashboard" -ForegroundColor White

Write-Host "`nTo test the deployed function:" -ForegroundColor Cyan
Write-Host "1. Update the URL in test-unified-function.js if needed" -ForegroundColor White
Write-Host "2. Run the test script: node test-unified-function.js" -ForegroundColor White

Write-Host "`nDon't forget to set the following environment variables in your Supabase project:" -ForegroundColor Yellow
Write-Host "- TICKETMASTER_KEY: Your Ticketmaster API key" -ForegroundColor White
Write-Host "- PREDICTHQ_API_KEY: Your PredictHQ API key" -ForegroundColor White
