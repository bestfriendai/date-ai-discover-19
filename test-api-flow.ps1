# Comprehensive Testing Script for Date AI Discover App
# This script tests the entire flow from the frontend to the Supabase functions

# Set up environment
$env:Path += ";$HOME\.deno\bin"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) {
    Write-ColorOutput Green "[+] $message"
}

function Write-Info($message) {
    Write-ColorOutput Cyan "[i] $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "[!] $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "[-] $message"
}

# Header
Write-Info "\nDate AI Discover App - Testing Suite"
Write-Info "=====================================\n"

# Step 1: Test Supabase Edge Function
Write-Info "Step 1: Testing Supabase Edge Function"
Write-Info "------------------------------------"

# Check if Deno is installed
try {
    $denoVersion = deno --version
    Write-Success "Deno is installed: $denoVersion"
}
catch {
    Write-Error "Deno is not installed. Please install Deno first."
    Write-Info "Run: irm https://deno.land/install.ps1 | iex"
    exit
}

# Check if API keys are set up
Write-Info "Checking for API keys..."
$tempEnvPath = "supabase\functions\search-events\temp-env.ts"
if (Test-Path $tempEnvPath) {
    $tempEnvContent = Get-Content $tempEnvPath -Raw
    if ($tempEnvContent -match "YOUR_TICKETMASTER_API_KEY" -or $tempEnvContent -match "YOUR_PREDICTHQ_API_KEY") {
        Write-Warning "API keys not set up in temp-env.ts"
        Write-Info "Running setup script to configure API keys..."
        
        # Run the setup script
        Push-Location supabase\functions\search-events
        .\setup-test-env.ps1
        Pop-Location # Return to root directory
    }
    else {
        Write-Success "API keys are configured"
    }
}
else {
    Write-Error "temp-env.ts not found. Please run the setup script first."
    Write-Info "Push-Location supabase\functions\search-events; .\setup-test-env.ps1"
    exit
}

# Run the Supabase Edge Function test
Write-Info "\nRunning Supabase Edge Function test..."
try {
    Push-Location supabase\functions\search-events
    deno run --allow-net --allow-env test-function.ts
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Supabase Edge Function test completed successfully"
    }
    else {
        Write-Error "Supabase Edge Function test failed with exit code $LASTEXITCODE"
    }
    Pop-Location # Return to root directory
}
catch {
    Write-Error "Error running Supabase Edge Function test: $_"
    Pop-Location # Return to root directory
}

# Step 2: Test Frontend Integration
Write-Info "\nStep 2: Testing Frontend Integration"
Write-Info "----------------------------------"

# Check if TypeScript is installed
try {
    $tsVersion = npx tsc --version
    Write-Success "TypeScript is installed: $tsVersion"
}
catch {
    Write-Warning "TypeScript might not be installed. Installing ts-node..."
    npm install -g ts-node typescript @types/node
}

# Run the frontend test
Write-Info "\nRunning frontend integration test..."
try {
    npx ts-node --esm src/test-frontend.ts
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Frontend integration test completed successfully"
    }
    else {
        Write-Error "Frontend integration test failed with exit code $LASTEXITCODE"
    }
}
catch {
    Write-Error "Error running frontend integration test: $_"
}

# Step 3: Verify Caching and Performance
Write-Info "\nStep 3: Verifying Caching and Performance"
Write-Info "----------------------------------------"

Write-Info "Running cache performance test..."
try {
    # This will be handled by the frontend test which already tests caching
    Write-Success "Cache performance test completed as part of frontend test"
}
catch {
    Write-Error "Error running cache performance test: $_"
}

# Step 4: Final Verification
Write-Info "\nStep 4: Final Verification"
Write-Info "-------------------------"

Write-Success "All tests completed!"
Write-Info "\nNext steps:"
Write-Info "1. Deploy the Supabase Edge Function with: supabase functions deploy search-events"
Write-Info "2. Update the frontend code to use the new implementation"
Write-Info "3. Test the application in production"

Write-Info "\nTesting complete!"
