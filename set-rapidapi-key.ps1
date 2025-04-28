# PowerShell script to set the RapidAPI key for the search-events function

# Configuration
$projectRef = "akwvmljopucsnorvdwuu"
$functionName = "search-events"
$rapidApiKey = "92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9"

Write-Host "Setting RapidAPI key for search-events function..." -ForegroundColor Green

# Check if Supabase CLI is installed
$supabaseInstalled = $null
try {
    $supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
} catch {
    # Command not found
}

if ($supabaseInstalled) {
    # Set environment variables using Supabase CLI
    Write-Host "Using Supabase CLI to set environment variables..." -ForegroundColor Yellow
    
    # Navigate to the Supabase directory
    Set-Location -Path "supabase"
    
    # Set the environment variables
    supabase secrets set RAPIDAPI_KEY="$rapidApiKey" X_RAPIDAPI_KEY="$rapidApiKey" REAL_TIME_EVENTS_API_KEY="$rapidApiKey"
    
    # Return to the original directory
    Set-Location -Path ".."
    
    Write-Host "RapidAPI key set successfully!" -ForegroundColor Green
    Write-Host "You can now test the RapidAPI integration with: node test-rapidapi.js" -ForegroundColor Cyan
} else {
    # Provide manual instructions
    Write-Host "Supabase CLI not found. Please set the environment variables manually:" -ForegroundColor Yellow
    Write-Host "1. Go to the Supabase dashboard: https://app.supabase.com/project/$projectRef/settings/functions" -ForegroundColor White
    Write-Host "2. Find the 'search-events' function" -ForegroundColor White
    Write-Host "3. Add the following environment variables:" -ForegroundColor White
    Write-Host "   - RAPIDAPI_KEY: $rapidApiKey" -ForegroundColor White
    Write-Host "   - X_RAPIDAPI_KEY: $rapidApiKey" -ForegroundColor White
    Write-Host "   - REAL_TIME_EVENTS_API_KEY: $rapidApiKey" -ForegroundColor White
    Write-Host "4. Save the changes" -ForegroundColor White
    Write-Host "5. Redeploy the function if necessary" -ForegroundColor White
    
    Write-Host "`nAfter setting the environment variables, you can test the RapidAPI integration with: node test-rapidapi.js" -ForegroundColor Cyan
}
