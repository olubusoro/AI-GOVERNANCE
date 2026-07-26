"""
COUCH AI Infrastructure Tracker — FastAPI Application

Entry point. Run with:
    uvicorn main:app --reload --port 8000

Swagger docs available at: http://localhost:8000/docs
ReDoc available at:         http://localhost:8000/redoc
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models.schemas import HealthResponse
from routers import projects, webhook

# ---------------------------------------------------------------------------
# Load environment variables from .env (if present)
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
STATIC_IMAGES_DIR = BASE_DIR / "static" / "images"

# Ensure the static directory exists at startup
STATIC_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="COUCH AI Infrastructure Tracker API",
    description=(
        "Backend API for the COUCH Submission MVP — an AI-powered e-governance platform "
        "that tracks Nigerian public infrastructure projects using satellite imagery, "
        "AI confidence scoring, and crowdsourced WhatsApp community reports."
    ),
    version="1.0.0",
    contact={
        "name": "COUCH Team",
        "url": "https://github.com/JegedeJoseph/AI-GOVERNANCE",
    },
    license_info={
        "name": "MIT",
    },
)

# ---------------------------------------------------------------------------
# CORS — Allow Next.js frontend (localhost:3000) and any deployed domain
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "*"),  # Set in .env for production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static files — serve annotated satellite images from /static/images/
# ---------------------------------------------------------------------------
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(projects.router)
app.include_router(webhook.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="API health check",
    description="Returns the current operational status of the API. Used by deployment platforms to verify the service is running.",
)
def health_check():
    return HealthResponse(
        status="ok",
        environment=os.getenv("APP_ENV", "development"),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# Root redirect message
# ---------------------------------------------------------------------------
@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to the COUCH AI Infrastructure Tracker API 🇳🇬",
        "docs": "/docs",
        "health": "/health",
        "projects": "/api/projects",
    }
