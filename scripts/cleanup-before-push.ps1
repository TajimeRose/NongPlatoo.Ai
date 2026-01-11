# Pre-Push Cleanup Script
# Removes test files and temporary code before pushing to GitHub

Write-Host "Cleaning up test and temporary files..." -ForegroundColor Cyan
Write-Host ""

$filesToRemove = @(
    "test_tts.py",
    "backend\tmp_chatbot_fixed.py"
)

$removedCount = 0

foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Write-Host "Removing: $file" -ForegroundColor Yellow
        
        # Check if file is tracked by git
        $gitStatus = git ls-files $file 2>$null
        if ($gitStatus) {
            # Remove from git tracking
            git rm --cached $file 2>$null
            Write-Host "  Removed from git tracking" -ForegroundColor Green
        }
        
        # Delete the file
        Remove-Item $file -Force
        Write-Host "  Deleted from filesystem" -ForegroundColor Green
        $removedCount++
    }
    else {
        Write-Host "  Already removed: $file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Cleaned up $removedCount file(s)" -ForegroundColor Green
Write-Host ""

# Check for any remaining test files
Write-Host "Scanning for other test/temp files..." -ForegroundColor Cyan
$otherTestFiles = Get-ChildItem -Recurse -File | Where-Object { 
    $_.Name -match '^(test_|tmp_|temp_|debug_|scratch_).*\.py$' 
}

if ($otherTestFiles) {
    Write-Host "Found additional test/temp files:" -ForegroundColor Yellow
    foreach ($file in $otherTestFiles) {
        Write-Host "  - $($file.FullName)" -ForegroundColor Yellow
    }
    Write-Host ""
    $response = Read-Host "Remove these files too? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        foreach ($file in $otherTestFiles) {
            git rm --cached $file.FullName 2>$null
            Remove-Item $file.FullName -Force
            Write-Host "  Removed: $($file.Name)" -ForegroundColor Green
        }
    }
}
else {
    Write-Host "No other test/temp files found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
