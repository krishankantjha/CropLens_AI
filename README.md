# CropLens AI: APMC Market Intelligence, Supply Shock Detection & Procurement Intelligence Platform

> **Multi-Task AI Decision-Support Platform for Indian Agriculture**

---

## 📌 Project Overview
CropLens AI is an end-to-end decision-support platform designed to eliminate price asymmetry across Indian APMC mandis by fusing open government market records (Agmarknet), satellite remote sensing (Sentinel-2 NDVI), and weather data.

---

## 🏗 Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        MULTI-SOURCE DATA ENGINE                         │
│           (Agmarknet Prices + Open-Meteo Weather + Sentinel NDVI)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
                    ┌───────────────────────────────────┐
                    │   FastAPI BACKEND SERVER (Python) │
                    │   Exposes REST APIs at :8000/api  │
                    └─────────────────┬─────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│ React / Next.js   │        │ Voice Audio (gTTS)│        │ WhatsApp Bot      │
│ Frontend (:3000)  │        │ MP3 Stream Engine │        │ (Twilio Webhook)  │
└───────────────────┘        └───────────────────┘        └───────────────────┘
```

---

## 🛠 Phase 1 Setup Instructions

### 1. Activate Environment & Install Dependencies
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install required Python dependencies
pip install -r requirements.txt
```

### 2. Run Backend Server
```bash
# Start FastAPI development server
python main.py
```

* API Base URL: `http://localhost:8000`
* Interactive API Documentation (Swagger): `http://localhost:8000/docs`
