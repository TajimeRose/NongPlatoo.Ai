# Thai TTS Setup Script for World Journey AI
# Run this to install Google Cloud TTS support

Write-Host "=== Thai TTS Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if running in virtual environment
if ($env:VIRTUAL_ENV) {
    Write-Host "✓ Virtual environment detected: $env:VIRTUAL_ENV" -ForegroundColor Green
}
else {
    Write-Host "⚠ Warning: Not in a virtual environment" -ForegroundColor Yellow
    Write-Host "  Consider activating venv first" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing Google Cloud Text-to-Speech..." -ForegroundColor Cyan

# Install the package
pip install google-cloud-texttospeech

Write-Host ""
Write-Host "✓ Installation complete!" -ForegroundColor Green
Write-Host ""

# Check if GOOGLE_APPLICATION_CREDENTIALS is set
if ($env:GOOGLE_APPLICATION_CREDENTIALS) {
    Write-Host "✓ GOOGLE_APPLICATION_CREDENTIALS is set:" -ForegroundColor Green
    Write-Host "  $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Gray
    
    # Verify file exists
    if (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS) {
        Write-Host "✓ Service account key file found" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Service account key file NOT found!" -ForegroundColor Red
        Write-Host "  Please check the path" -ForegroundColor Yellow
    }
}
else {
    Write-Host "⚠ GOOGLE_APPLICATION_CREDENTIALS not set" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To use Google Cloud TTS, you need to:" -ForegroundColor White
    Write-Host "1. Create a Google Cloud project" -ForegroundColor White
    Write-Host "2. Enable Cloud Text-to-Speech API" -ForegroundColor White
    Write-Host "3. Create a service account and download JSON key" -ForegroundColor White
    Write-Host "4. Set environment variable:" -ForegroundColor White
    Write-Host "   `$env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\key.json'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or add to your .env file:" -ForegroundColor White
    Write-Host "   GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\key.json" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "See TTS_SETUP.md for detailed instructions" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Fallback Options ===" -ForegroundColor Cyan
Write-Host "If Google Cloud TTS is not configured:" -ForegroundColor White
Write-Host "• OpenAI TTS will be used (requires OPENAI_API_KEY)" -ForegroundColor Gray
Write-Host "• Browser-based TTS as last resort (lower quality)" -ForegroundColor Gray

Write-Host ""
Write-Host "=== Testing TTS ===" -ForegroundColor Cyan
Write-Host "Start your server and try:" -ForegroundColor White
Write-Host ""
Write-Host "`$body = @{ text = 'สวัสดีค่ะ'; language = 'th' } | ConvertTo-Json" -ForegroundColor Cyan
Write-Host "Invoke-WebRequest -Uri 'http://localhost:5000/api/text-to-speech' ``" -ForegroundColor Cyan
Write-Host "    -Method POST -ContentType 'application/json' -Body `$body" -ForegroundColor Cyan

Write-Host ""
Write-Host "Setup complete! 🎉" -ForegroundColor Green
