# Security Cleanup Script
# Run this before pushing to GitHub

Write-Host "🔒 Security Cleanup for GitHub Push" -ForegroundColor Cyan
Write-Host ""

# Check if log files exist and should be removed
$logFiles = @(
    "flask.log",
    "backend\db_check.log"
)

Write-Host "Checking for sensitive log files..." -ForegroundColor Yellow
$foundLogs = $false

foreach ($log in $logFiles) {
    if (Test-Path $log) {
        $foundLogs = $true
        Write-Host "❌ Found: $log (contains credentials!)" -ForegroundColor Red
    }
}

if ($foundLogs) {
    Write-Host ""
    $response = Read-Host "Remove log files from git? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        foreach ($log in $logFiles) {
            if (Test-Path $log) {
                git rm --cached $log 2>$null
                Write-Host "✓ Removed $log from git" -ForegroundColor Green
            }
        }
    }
}
else {
    Write-Host "✓ No sensitive log files found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Checking for .env files..." -ForegroundColor Yellow

if (Test-Path ".env") {
    $gitStatus = git ls-files .env 2>$null
    if ($gitStatus) {
        Write-Host "❌ .env is tracked by git!" -ForegroundColor Red
        $response = Read-Host "Remove .env from git tracking? (y/n)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            git rm --cached .env
            Write-Host "✓ Removed .env from git tracking" -ForegroundColor Green
        }
    }
    else {
        Write-Host "✓ .env exists but not tracked (good!)" -ForegroundColor Green
    }
}
else {
    Write-Host "⚠ No .env file found. Create one from .env.example" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Searching for hardcoded secrets in staged files..." -ForegroundColor Yellow

# Search for potential secrets in staged files
$secrets = git diff --cached | Select-String -Pattern "sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{35}|PdQ0GiGz"

if ($secrets) {
    Write-Host ""
    Write-Host "❌ POTENTIAL SECRETS FOUND IN STAGED FILES!" -ForegroundColor Red
    Write-Host "Review these matches:" -ForegroundColor Yellow
    $secrets | ForEach-Object { Write-Host $_.Line -ForegroundColor Red }
    Write-Host ""
    Write-Host "⚠️  DO NOT PUSH UNTIL SECRETS ARE REMOVED!" -ForegroundColor Red
}
else {
    Write-Host "✓ No obvious secrets found in staged changes" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Pre-Push Checklist ===" -ForegroundColor Cyan
Write-Host "[ ] .env file is NOT staged" -ForegroundColor White
Write-Host "[ ] Log files are NOT staged" -ForegroundColor White
Write-Host "[ ] No API keys in code" -ForegroundColor White
Write-Host "[ ] No passwords in docker-compose.yml" -ForegroundColor White
Write-Host "[ ] All secrets use environment variables" -ForegroundColor White

Write-Host ""
Write-Host "Review SECURITY_CHECKLIST.md for complete guide" -ForegroundColor Gray
Write-Host ""

# Check current branch
$branch = git branch --show-current
Write-Host "Current branch: $branch" -ForegroundColor Cyan

Write-Host ""
Write-Host "Ready to continue? Review changes with:" -ForegroundColor White
Write-Host "  git status" -ForegroundColor Cyan
Write-Host "  git diff --staged" -ForegroundColor Cyan
