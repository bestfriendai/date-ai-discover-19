# Setup Test Environment for Supabase Edge Functions
# This script helps set up the environment variables needed for testing

# Check if Deno is installed
$denoVersion = deno --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deno is not installed. Installing Deno..."
    irm https://deno.land/install.ps1 | iex
    $env:Path += ";$HOME\.deno\bin"
}

Write-Host "\nSetting up test environment for Supabase Edge Functions..." -ForegroundColor Green

# Prompt for API keys
Write-Host "\nPlease enter your API keys from the Supabase dashboard:" -ForegroundColor Yellow
$ticketmasterKey = Read-Host "Enter your TICKETMASTER_API_KEY"
$predicthqKey = Read-Host "Enter your PREDICTHQ_API_KEY"

# Update the temporary environment file
$envContent = @"
/**
 * Temporary environment variables for testing the Supabase Edge Function
 * 
 * IMPORTANT: Do not commit this file to version control!
 * Delete this file after testing is complete.
 */

// Add your API keys here for testing
export const TICKETMASTER_API_KEY = `$ticketmasterKey`;
export const PREDICTHQ_API_KEY = `$predicthqKey`;
"@

$envContent | Out-File -FilePath "temp-env.ts" -Encoding utf8

Write-Host "\nEnvironment variables have been set up in temp-env.ts" -ForegroundColor Green
Write-Host "You can now run the test with: deno run --allow-net --allow-env test-function.ts" -ForegroundColor Green
