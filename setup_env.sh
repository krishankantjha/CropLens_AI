#!/bin/bash
# CropLens AI - Environment Setup Script for Linux/Mac

echo "--- CropLens AI Environment Setup ---"

# 1. Setup Backend .env
if [ -f "backend/.env.example" ]; then
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        echo "[✓] Created backend/.env"
    else
        echo "[!] backend/.env already exists. Skipping."
    fi
fi

# 2. Setup Frontend .env
if [ -f "frontend/.env.example" ]; then
    if [ ! -f "frontend/.env" ]; then
        cp frontend/.env.example frontend/.env
        echo "[✓] Created frontend/.env"
    else
        echo "[!] frontend/.env already exists. Skipping."
    fi
fi

echo -e "\nSetup Complete! Now open the .env files and paste your API keys."
