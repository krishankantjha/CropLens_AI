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

# 2. Setup Frontend .env
if (Test-Path "frontend\.env.example") {
    if (-not (Test-Path "frontend\.env")) {
        Copy-Item "frontend\.env.example" "frontend\.env"
        Write-Host "[✓] Created frontend\.env" -ForegroundColor Green
    } else {
        Write-Host "[!] frontend\.env already exists. Skipping." -ForegroundColor Yellow
    }
}

Write-Host "`nSetup Complete! Now open the .env files and paste your API keys." -ForegroundColor Cyan
