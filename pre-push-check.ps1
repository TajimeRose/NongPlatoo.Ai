# Pre-Push Checklist Script
# Run this before pushing to ensure code quality and security

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PRE-PUSH CHECKLIST & VALIDATION           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$issues = 0

# 1. Check for test/temp files
Write-Host "[ 1/7 ] Checking for test/temp files..." -ForegroundColor Yellow
$testFiles = git ls-files | Select-String -Pattern "(test_|tmp_|temp_|debug_|scratch_).*\.py$"
if ($testFiles) {
    Write-Host "  ❌ Found test/temp files in git:" -ForegroundColor Red
    $testFiles | ForEach-Object { Write-Host "      - $_" -ForegroundColor Red }
    $issues++
} else {
    Write-Host "  ✅ No test/temp files" -ForegroundColor Green
}

# 2. Check for .env files
Write-Host "[ 2/7 ] Checking for .env files..." -ForegroundColor Yellow
$envFiles = git ls-files | Select-String -Pattern "\.env$"
if ($envFiles) {
    Write-Host "  ❌ .env file is tracked!" -ForegroundColor Red
    $issues++
} else {
    Write-Host "  ✅ .env not tracked" -ForegroundColor Green
}

# 3. Check for log files
Write-Host "[ 3/7 ] Checking for log files..." -ForegroundColor Yellow
$logFiles = git ls-files | Select-String -Pattern "\.log$"
if ($logFiles) {
    Write-Host "  ❌ Log files found:" -ForegroundColor Red
    $logFiles | ForEach-Object { Write-Host "      - $_" -ForegroundColor Red }
    $issues++
} else {
    Write-Host "  ✅ No log files tracked" -ForegroundColor Green
}

# 4. Search for hardcoded secrets
Write-Host "[ 4/7 ] Scanning for hardcoded secrets..." -ForegroundColor Yellow
$secretPatterns = @(
    "sk-[a-zA-Z0-9]{20,}",
    "AIza[a-zA-Z0-9_-]{35}",
    "PdQ0GiGz",
    "password\s*=\s*['\"][^'\"{}]+['\"]"
)

$foundSecrets = $false
foreach ($pattern in $secretPatterns) {
    $matches = git grep -E $pattern -- "*.py" "*.yml" "*.json" 2>$null
    if ($matches) {
        if (-not $foundSecrets) {
            Write-Host "  ❌ Potential secrets found:" -ForegroundColor Red
            $foundSecrets = $true
            $issues++
        }
        Write-Host "      Pattern: $pattern" -ForegroundColor Red
    }
}
if (-not $foundSecrets) {
    Write-Host "  ✅ No hardcoded secrets detected" -ForegroundColor Green
}

# 5. Check for debug code
Write-Host "[ 5/7 ] Checking for debug code..." -ForegroundColor Yellow
$debugCode = git grep -E "(print\(|console\.log\(|debugger;)" -- "*.py" "*.js" "*.tsx" "*.ts" 2>$null | Measure-Object -Line
if ($debugCode.Lines -gt 50) {  # Allow some logging
    Write-Host "  ⚠️  Found $($debugCode.Lines) debug statements (review recommended)" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Debug code looks clean" -ForegroundColor Green
}

# 6. Python syntax check
Write-Host "[ 6/7 ] Checking Python syntax..." -ForegroundColor Yellow
$pyFiles = @("app.py", "backend\chat.py", "backend\db.py", "backend\gpt_service.py")
$syntaxErrors = 0
foreach ($file in $pyFiles) {
    if (Test-Path $file) {
        $result = python -m py_compile $file 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ Syntax error in $file" -ForegroundColor Red
            $syntaxErrors++
        }
    }
}
if ($syntaxErrors -eq 0) {
    Write-Host "  ✅ All Python files have valid syntax" -ForegroundColor Green
} else {
    Write-Host "  ❌ Found $syntaxErrors file(s) with syntax errors" -ForegroundColor Red
    $issues++
}

# 7. Check git status
Write-Host "[ 7/7 ] Checking git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    $stagedFiles = ($gitStatus | Where-Object { $_ -match "^[AM]" }).Count
    $unstagedFiles = ($gitStatus | Where-Object { $_ -match "^ [AM]" }).Count
    Write-Host "  ℹ️  Staged files: $stagedFiles" -ForegroundColor Cyan
    Write-Host "  ℹ️  Unstaged files: $unstagedFiles" -ForegroundColor Cyan
} else {
    Write-Host "  ℹ️  Working directory clean" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              CHECKLIST RESULTS                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($issues -eq 0) {
    Write-Host "✅ All checks passed! Safe to push." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. git add ." -ForegroundColor Cyan
    Write-Host "  2. git commit -m 'Your message'" -ForegroundColor Cyan
    Write-Host "  3. git push" -ForegroundColor Cyan
} else {
    Write-Host "❌ Found $issues issue(s) - DO NOT PUSH YET!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix issues with:" -ForegroundColor Yellow
    Write-Host "  ./cleanup-before-push.ps1  # Remove test files" -ForegroundColor Cyan
    Write-Host "  ./security-check.ps1       # Remove secrets" -ForegroundColor Cyan
}

Write-Host ""
exit $issues
