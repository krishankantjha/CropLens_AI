# Production Multi-Quantile Backend Dockerfile for CropLens AI
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (libgomp1 required for LightGBM OpenMP runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the resolved backend dependency lock and install reproducibly.
COPY backend/requirements.lock ./backend/requirements.lock
RUN pip install --no-cache-dir -r ./backend/requirements.lock

# Copy backend application codebase and processed dataset
COPY backend ./backend
COPY data ./data

EXPOSE 8000

ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

