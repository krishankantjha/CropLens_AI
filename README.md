# CropLens AI: APMC Market Intelligence, Supply Shock Detection & Procurement Platform

> **Multi-Task AI Decision-Support Platform for Indian Agricultural Markets**

---

## 📌 Project Overview

**CropLens AI** is an enterprise-grade, production-hardened decision-support platform engineered to eliminate price asymmetry across Indian Agricultural Produce Market Committee (APMC) mandis. By fusing open government market records (Agmarknet), meteorological indices (NASA POWER), and vegetative health satellite data (Sentinel-2 NDVI), CropLens AI provides farmers, traders, and agricultural cooperatives with probabilistic price forecasts, spatial arbitrage opportunities, and automated supply shock alerts.

---

## 🎯 Problem Statement & Solution

### The Challenge
Indian agricultural markets suffer from severe information asymmetry. Farmers frequently experience distress selling during harvest gluts due to a lack of forward-looking price visibility, while traders and cooperatives lack real-time visibility into regional arrival shocks and transport cost gradients across mandis.

### The CropLens AI Solution
CropLens AI bridges this gap through an end-to-end intelligence pipeline:
1. **Multimodal Data Ingestion:** Automated synchronization of daily market data, NASA POWER indices, and Sentinel-2 NDVI metrics.
2. **Canonical Feature Engineering:** Unified transformation logic ensuring training/inference consistency across 47 agricultural features.
3. **Probabilistic Price Forecasting:** LightGBM quantile regression models estimating $P_{10}$ floors, $P_{50}$ medians, and $P_{90}$ ceilings.
4. **Model Registry:** Versioned model management allowing configuration-driven deployment of LightGBM and anomaly detection artifacts.
5. **Spatial Arbitrage & Supply Shock Detection:** Real-time cross-mandi profit calculations and Isolation Forest anomaly flagging.

---

## 👥 Target Users

* **Farmers:** Receive daily actionable advisories ("Wait 3 days", "Sell now at Azadpur Mandi") and probabilistic price outlooks to maximize harvest revenue.
* **Traders & Cooperatives:** Access spatial arbitrage matrices, supply shock alert feeds, and automated procurement PDF reports.
* **Agricultural Analysts:** Utilize reproducible research notebooks, SHAP explainability models, and rigorous evaluation metrics (MAE, RMSE, Pinball Loss, Winkler Score).

---

## 🏗 System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MULTI-SOURCE DATA ENGINE                        │
│           (Agmarknet Prices + NASA POWER Weather + Sentinel NDVI)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                  ┌───────────────────────────────────┐
                  │    FastAPI BACKEND (Python 3.12)  │
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

---

## 🛠 Complete Technology Inventory

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, Wouter, Radix UI | React 19 / Vite 7 | Responsive, accessible Single Page Application (SPA). |
| **Backend** | FastAPI, Python, SQLAlchemy, Alembic | FastAPI 0.115 / SQLAlchemy 2.0 | High-performance asynchronous REST API with database migrations. |
| **Database & Cache** | SQLite / PostgreSQL, Redis | Redis 5.0+ | Relational persistence, OTP session storage, distributed rate limiting, and refresh token rotation. |
| **Machine Learning** | LightGBM, Scikit-learn, PyTorch, Joblib | LightGBM 4.7 | Quantile regression price forecasting and Isolation Forest anomaly detection. |
| **DevOps & Testing** | Docker, Nginx, Pytest, Playwright | Pytest 8.3 / Playwright 1.50 | Containerization, structured JSON logging, and E2E test suites. |

---

## 🚀 Complete Feature Inventory

| Feature | Module | Backend Endpoint | Frontend Page / Component | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile OTP Auth** | Authentication | `/api/v1/auth/otp/*` | `Login.tsx`, `Verify.tsx` | Fully Implemented |
| **Onboarding Wizard** | Onboarding | `/api/v1/auth/preferences` | `Onboarding.tsx` | Fully Implemented |
| **Kisan Hub Dashboard** | Advisory | `/api/v1/predict/forecast-7d` | `KisanHub.tsx` | Fully Implemented |
| **Mandi Arbitrage** | Procurement | `/api/v1/procurement/arbitrage` | `MandiWorkspace.tsx` | Fully Implemented |
| **PDF Procurement Reports**| Reporting | `/api/v1/procurement/pdf` | `MandiWorkspace.tsx` | Fully Implemented |
| **Supply Shock Alerts** | Alerts | `/api/v1/predict/shocks` | `AlertsPage.tsx` | Fully Implemented |
| **Regional Localization** | i18n | N/A (Client-side) | `translations.ts` (9 Languages) | Fully Implemented |
| **Automated Sync** | Scheduler | `/api/v1/system/trigger-sync` | APScheduler Background Worker | Fully Implemented |

---

## 📡 Core API Reference

### Authentication & User Management
* `POST /api/v1/auth/otp/send` — Dispatches 6-digit verification code to mobile number.
* `POST /api/v1/auth/otp/verify` — Validates OTP, consumes code, and issues JWT Access + Refresh tokens.
* `POST /api/v1/auth/refresh` — Rotates access tokens using a valid refresh token.
* `GET /api/v1/auth/me` — Returns authenticated user profile and preferences.

### Forecasting & Analytics
* `POST /api/v1/predict/forecast-7d` — Generates 7-day quantile price forecasts ($P_{10}$, $P_{50}$, $P_{90}$) and actionable recommendations.
* `GET /api/v1/predict/analytics-trends` — Retrieves 30-day price trends, volatility metrics, and arrival volume statistics.

### Procurement & Arbitrage
* `GET /api/v1/procurement/arbitrage` — Computes cross-mandi net revenue and transport cost differentials.
* `GET /api/v1/procurement/pdf` — Generates professional downloadable PDF procurement reports.

---

## 🛠 Setup & Installation Guide

### Prerequisites
* Python 3.12+
* Node.js 22+ & npm/pnpm
* Redis (Optional: falls back to in-memory store if unconfigured)

### 1. Backend Setup (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI server
python app/main.py
```
* API Base URL: `http://localhost:8000`
* Interactive API Documentation (Swagger): `http://localhost:8000/docs`

### 2. Frontend Setup (React SPA)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
* Local App URL: `http://localhost:5173`

---

## Research Artifacts and Paper Ownership

The canonical IEEE manuscript is `reports/research_paper/croplens_ieee_paper.tex`, with its bibliography in `reports/research_paper/references.bib` and manuscript-specific figures in `reports/research_paper/figures/`. Exploratory analysis figures belong in `reports/eda_insights/`, model-evaluation figures belong in `reports/model_evaluation/`, and frozen tabular research evidence belongs in `research/artifacts/research_results/`.

The evaluation figure set and manuscript figure set are maintained separately because the corresponding files are not byte-identical: the former records evaluation outputs, while the latter contains the exact assets referenced by the paper source. Generated model binaries, checkpoints, local backups, caches, logs, frontend build output, and LaTeX auxiliary files remain local and are excluded from version control.

---

## 🧪 Automated Testing

* **Backend Unit & Integration Tests (`pytest`):**
  ```bash
  cd backend
  pytest
  ```
* **Frontend End-to-End Tests (`Playwright`):**
  ```bash
  cd frontend
  npx playwright test
  ```

---
**Maintained by Krishan Kant Jha.**
