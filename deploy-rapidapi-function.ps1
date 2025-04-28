# PowerShell script to deploy the updated search-events function with RapidAPI support

# Configuration
$projectRef = "akwvmljopucsnorvdwuu"
$functionName = "search-events"
$rapidApiKey = "92bc1b4fc7mshacea9f118bf7a3fp1b5a6cjsnd2287a72fcb9"

Write-Host "Deploying updated search-events function with RapidAPI support..." -ForegroundColor Green

# Navigate to the function directory
Set-Location -Path "supabase/functions/search-events"

# Check if supabase CLI is installed
$supabaseInstalled = $null
try {
    $supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
} catch {
    # Command not found
}

if ($supabaseInstalled) {
    # Deploy the function using Supabase CLI
    Write-Host "Deploying with Supabase CLI..." -ForegroundColor Yellow
    
    # Set environment variables
    Write-Host "Setting RapidAPI environment variables..." -ForegroundColor Yellow
    supabase secrets set RAPIDAPI_KEY="$rapidApiKey" X_RAPIDAPI_KEY="$rapidApiKey" REAL_TIME_EVENTS_API_KEY="$rapidApiKey"
    
    # Deploy the function
    supabase functions deploy search-events
    
    Write-Host "Function deployed successfully!" -ForegroundColor Green
} else {
    # Create a zip file for manual deployment
    Write-Host "Supabase CLI not found. Creating deployment zip file instead..." -ForegroundColor Yellow
    
    # Create a zip file of the function
    Compress-Archive -Path * -DestinationPath "../../search-events-deploy.zip" -Force
    
    Write-Host "Deployment zip file created at: supabase/search-events-deploy.zip" -ForegroundColor Green
    Write-Host "Please upload this zip file manually through the Supabase dashboard." -ForegroundColor Yellow
    
    # Provide manual instructions for setting environment variables
    Write-Host "`nPlease set the environment variables manually:" -ForegroundColor Yellow
    Write-Host "1. Go to the Supabase dashboard: https://app.supabase.com/project/$projectRef/settings/functions" -ForegroundColor White
    Write-Host "2. Find the 'search-events' function" -ForegroundColor White
    Write-Host "3. Add the following environment variables:" -ForegroundColor White
    Write-Host "   - RAPIDAPI_KEY: $rapidApiKey" -ForegroundColor White
    Write-Host "   - X_RAPIDAPI_KEY: $rapidApiKey" -ForegroundColor White
    Write-Host "   - REAL_TIME_EVENTS_API_KEY: $rapidApiKey" -ForegroundColor White
    Write-Host "4. Save the changes" -ForegroundColor White
    Write-Host "5. Redeploy the function" -ForegroundColor White
    
    # Open the Supabase dashboard in the default browser
    Start-Process "https://app.supabase.com/project/$projectRef/settings/functions"
}

# Return to the original directory
Set-Location -Path "../../.."

Write-Host "`nAfter deploying the function, you can test the RapidAPI integration with: node test-rapidapi.js" -ForegroundColor Cyan
