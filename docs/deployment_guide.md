# CropLens AI — Production Deployment & Cloud Staging Guide

This guide provides step-by-step instructions for running CropLens AI locally via Docker Compose and deploying it to free/low-cost cloud staging platforms.

---

## 1. System Architecture & Container Topology

```mermaid
graph TD
    User([Farmer / Trader Browser]) -->|HTTP Port 5173 / 80| Frontend[Frontend Container: Nginx Alpine]
    Frontend -->|Static Files: HTML, JS, CSS| User
    Frontend -->|Reverse Proxy: /api/*| Backend[Backend Container: FastAPI Python 3.11]
    
    Backend --> DB[(SQLite Database: croplens.db)]
    Backend --> ML[Quantile ML Models: p10, p50, p90.pkl]
    Backend --> Sched[APScheduler Background Jobs]
```

### Components:
* **Backend (`croplens_backend`):** Python 3.11-slim, Uvicorn, FastAPI, LightGBM, PyTorch, APScheduler.
* **Frontend (`croplens_frontend`):** Multi-stage build (Node 20 Alpine builder $\to$ Nginx Alpine production runtime with SPA routing and Gzip compression).
* **Database:** Embedded SQLite database (`croplens.db`) with Docker volume persistence.

---

## 2. Local Deployment via Docker Compose

### Prerequisites
* Docker Engine 20.10+ and Docker Compose v2+ installed.

### Quick Start (Single Command)
To build and launch the entire CropLens AI stack in background mode:

```bash
# Build and start all services
docker compose up --build -d
```

### Access Points
* **Farmer & Trader Web Dashboard:** [http://localhost:5173](http://localhost:5173)
* **FastAPI Backend Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

### Monitoring & Maintenance Commands

```bash
# Check running container statuses & healthcheck results
docker compose ps

# View live consolidated logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Stop all containers
docker compose down

# Stop and remove volumes (clean reset)
docker compose down -v
```

---

## 3. Zero-Cost Cloud Staging Deployment Options

CropLens AI is completely self-contained with no paid cloud dependencies. You can deploy it to any of the following free-tier cloud platforms:

### Option A: Render.com (Free Web Services)
1. **Backend Service:**
   * Create a new **Web Service** pointing to your GitHub repository.
   * Environment: `Docker` (select root `Dockerfile`).
   * Port: `8000`.
   * Add Environment Variables:
     * `CORS_ORIGINS`: `https://your-frontend.onrender.com`
     * `PYTHONUNBUFFERED`: `1`
2. **Frontend Service:**
   * Create a **Static Site** or **Web Service** pointing to `frontend/Dockerfile`.
   * Set `VITE_API_BASE_URL` to `https://your-backend.onrender.com`.

---

### Option B: Railway.app (Free Hobby Tier)
1. Link your GitHub repo to a new Railway project.
2. Railway will automatically detect `docker-compose.yml` and provision both the `backend` and `frontend` services.
3. Expose the frontend service to generate a public domain (`*.up.railway.app`).

---

### Option C: Hugging Face Spaces (Docker SDK — 100% Free CPU Tier)
1. Create a new Space on Hugging Face with the **Docker** SDK.
2. Push the repository. Hugging Face builds and hosts the full multi-quantile forecasting engine for free with high uptime and public sharing links.

---

### Option D: Fly.io (Free / Low Cost)
1. Launch backend:
   ```bash
   fly launch --dockerfile Dockerfile --port 8000
   ```
2. Launch frontend:
   ```bash
   cd frontend && fly launch --dockerfile Dockerfile --port 80
   ```

---

## 4. Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `8000` | Port for the Uvicorn FastAPI server |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins for browser security |
| `TELEGRAM_BOT_TOKEN` | *(Optional)* | Telegram Bot API Token for live automated push alerts |
| `TWILIO_ACCOUNT_SID` | *(Optional)* | Twilio Account SID for WhatsApp sandbox testing |
| `TWILIO_AUTH_TOKEN` | *(Optional)* | Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` | Twilio registered WhatsApp sender number |

---

## 5. Production Health Verification Checklist

Before presenting or submitting your project:
- [ ] Verify `docker compose ps` shows both `croplens_backend` and `croplens_frontend` with status `healthy`.
- [ ] Query `http://localhost:8000/health` $\to$ returns `"status": "healthy"`.
- [ ] Query `http://localhost:8000/api/v1/system/scheduler-status` $\to$ returns 4 active background jobs.
- [ ] Open `http://localhost:5173` $\to$ verify Kisan Advisory Hub renders 7-day roll-forward bars and live peak-day recommendations.
