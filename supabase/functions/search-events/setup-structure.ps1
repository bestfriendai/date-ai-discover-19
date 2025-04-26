# PowerShell script to set up the directory structure for the redesigned Supabase functions

# Create directories if they don't exist
$directories = @(
    "services",
    "normalizers",
    "validators",
    "utils",
    "shared"
)

foreach ($dir in $directories) {
    $path = "$PSScriptRoot\$dir"
    if (-not (Test-Path $path)) {
        Write-Host "Creating directory: $path"
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

# Move new files to their correct locations
Write-Host "Moving files to their correct locations..."

# Check if files exist before moving
$filesToMove = @(
    @{Source = "index.new.ts"; Destination = "index.ts"},
    @{Source = "types.new.ts"; Destination = "types.ts"},
    @{Source = "deno.json.new"; Destination = "deno.json"}
)

foreach ($file in $filesToMove) {
    $sourcePath = "$PSScriptRoot\$($file.Source)"
    $destPath = "$PSScriptRoot\$($file.Destination)"
    
    if (Test-Path $sourcePath) {
        # Backup existing file if it exists
        if (Test-Path $destPath) {
            $backupPath = "$destPath.backup"
            Write-Host "Backing up $destPath to $backupPath"
            Copy-Item -Path $destPath -Destination $backupPath -Force
        }
        
        Write-Host "Moving $sourcePath to $destPath"
        Move-Item -Path $sourcePath -Destination $destPath -Force
    } else {
        Write-Host "Source file not found: $sourcePath"
    }
}

Write-Host "Setup complete!"
