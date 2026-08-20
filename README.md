# CropLens AI: APMC Market Intelligence, Supply Shock Detection & Procurement Platform

> **Multi-Task AI Decision-Support Platform for Indian Agricultural Markets**

---

## 📌 Project Overview

CropLens AI is an enterprise-grade, production-hardened decision-support platform designed to eliminate price asymmetry across Indian APMC mandis. By fusing open government agricultural records (Agmarknet), meteorological indices (NASA POWER), and vegetative health metrics (Sentinel-2 NDVI), CropLens AI provides farmers, traders, and agricultural cooperatives with probabilistic price forecasts, spatial arbitrage opportunities, and automated supply shock alerts.

---

## 🏗 System Architecture & Technology Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MULTI-SOURCE DATA ENGINE                        │
│           (Agmarknet Prices + NASA POWER Weather + Sentinel NDVI)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                  ┌───────────────────────────────────┐
                  │    FastAPI BACKEND (Python)       │
                  │    REST API / SQLAlchemy / Redis  │
                  └─────────────────┬─────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ React 19 + Vite  │       │ LightGBM Q-Reg   │       │ WhatsApp / Telegram│
│ Frontend SPA     │       │ ($P_{10}/P_{50}/P_{90}$) │ Automated Alerts │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Verified Technology Inventory

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4, Wouter, Radix UI | Responsive Single Page Application (SPA) with multi-language support. |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy, Alembic | High-performance asynchronous REST API with database migrations. |
| **Database & Cache** | SQLite (Local/Dev) / PostgreSQL (Production), Redis | Relational data persistence, OTP session storage, and distributed rate limiting. |
| **Machine Learning** | LightGBM, Scikit-learn, PyTorch, Joblib | Quantile regression price forecasting ($P_{10}$, $P_{50}$, $P_{90}$) and Isolation Forest anomaly detection. |
| **DevOps & Testing** | Docker, Nginx, Pytest, Playwright | Containerized deployment, structured JSON logging, and E2E test suites. |

---

## 🚀 Key Features & Modules

1. **Authentication & Security:** Mobile OTP passwordless login and registration backed by Redis TTL sessions and distributed sliding-window rate limiting.
2. **Kisan Hub Dashboard:** Real-time commodity price tracking, weather impact summaries, 7-day price trajectory outlooks, and market-shift simulation.
3. **Mandi Workspace (Spatial Arbitrage):** Dynamic freight and net-profit calculation across regional APMC mandis with instant PDF report generation.
4. **Supply Shock & Alert Feed:** Automated anomaly detection flagging sudden volume gluts or price drops.
5. **Internationalization:** Full multi-language support across 9 regional Indian languages (Hindi, Marathi, Kannada, Telugu, Tamil, Gujarati, Bengali, Punjabi, English).

---

## 🛠 Setup & Installation Guide

### 1. Backend Setup (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI development server
python app/main.py
```
* API Base URL: `http://localhost:8000`
* Interactive API Documentation (Swagger): `http://localhost:8000/docs` (Enabled in development mode)

### 2. Frontend Setup (React SPA)
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
* Frontend Local URL: `http://localhost:5173`

---

## 🧪 Running Automated Tests

* **Backend Tests (`pytest`):**
  ```bash
  cd backend
  pytest
  ```
* **Frontend E2E Tests (`Playwright`):**
  ```bash
  cd frontend
  npx playwright test
  ```

---
**Maintained by Krishan Kant Jha.**
