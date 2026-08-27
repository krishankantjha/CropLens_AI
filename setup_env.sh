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


echo -e "\nSetup Complete! Review backend/.env and add any required secrets."
