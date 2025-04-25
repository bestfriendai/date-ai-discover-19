# PowerShell script to deploy the unified search-events function to Supabase

Write-Host "Deploying search-events-unified function to Supabase..." -ForegroundColor Green

# Navigate to the function directory
Set-Location -Path "supabase/functions/search-events-unified"

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
    supabase functions deploy search-events-unified
} else {
    # Alternative deployment method using zip file
    Write-Host "Supabase CLI not found. Creating deployment zip file instead..." -ForegroundColor Yellow
    
    # Create a zip file of the function
    Compress-Archive -Path * -DestinationPath "../../search-events-unified-deploy.zip" -Force
    
    Write-Host "Deployment zip file created at: supabase/search-events-unified-deploy.zip" -ForegroundColor Green
    Write-Host "Please upload this zip file manually through the Supabase dashboard." -ForegroundColor Yellow
}

# Return to the original directory
Set-Location -Path "../../.."

Write-Host "Deployment process completed!" -ForegroundColor Green
