from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict

# Initialize FastAPI App with Official Project Title
app = FastAPI(
    title="CropLens AI: APMC Market Intelligence, Supply Shock Detection & Procurement Intelligence Platform",
    description="APMC Market Intelligence, Supply Shock Detection & Procurement Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS Middleware for Frontend Communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

@app.get("/", tags=["General"])
def read_root() -> Dict[str, str]:
    """Root Endpoint welcoming users to CropLens AI API Engine."""
    return {
        "message": "Welcome to CropLens AI: APMC Market Intelligence, Supply Shock Detection & Procurement Intelligence Platform API Engine",
        "documentation": "/docs",
        "status": "Operational"
    }

@app.get("/health", response_model=HealthResponse, tags=["General"])
def health_check() -> HealthResponse:
    """System Health Check Endpoint."""
    return HealthResponse(
        status="healthy",
        service="CropLens AI: APMC Market Intelligence, Supply Shock Detection & Procurement Intelligence Platform Backend Engine",
        version="1.0.0"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
