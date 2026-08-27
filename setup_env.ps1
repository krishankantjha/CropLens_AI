# CropLens AI - Environment Setup Script for Windows
# This script creates local .env files from templates.

Write-Host "--- CropLens AI Environment Setup ---" -ForegroundColor Cyan

# 1. Setup Backend .env
if (Test-Path "backend\.env.example") {
    if (-not (Test-Path "backend\.env")) {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "[✓] Created backend\.env" -ForegroundColor Green
    } else {
        Write-Host "[!] backend\.env already exists. Skipping." -ForegroundColor Yellow
    }
}


Write-Host "`nSetup Complete! Review backend\.env and add any required secrets." -ForegroundColor Cyan
