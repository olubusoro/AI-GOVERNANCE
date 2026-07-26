"""
Pydantic schemas for request and response validation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Nested sub-models
# ---------------------------------------------------------------------------

class LocationSchema(BaseModel):
    lat: float
    lng: float
    label: str


class BudgetSchema(BaseModel):
    official_ngn: int
    official_usd: int
    disbursed_ngn: int
    disbursed_usd: int


class DetectedObject(BaseModel):
    class_name: str = Field(..., alias="class")
    count: int
    confidence: float

    model_config = {"populate_by_name": True}


class AIAnalysisSchema(BaseModel):
    confidence_score: float
    label: str
    detail: str
    bounding_box_image: str
    last_analyzed: str


class WhatsAppReportsSchema(BaseModel):
    count: int
    summary: str
    last_report: str


class TimelineSchema(BaseModel):
    start_date: str
    expected_end: str
    completion_pct: int


# ---------------------------------------------------------------------------
# Core project schemas
# ---------------------------------------------------------------------------

class ProjectSummary(BaseModel):
    """Lightweight project data used for map pin listing."""
    id: int
    name: str
    status: str
    sector: str
    location: LocationSchema
    ai_analysis: AIAnalysisSchema
    whatsapp_reports: WhatsAppReportsSchema


class ProjectDetail(ProjectSummary):
    """Full project data used for the side-panel detail view."""
    description: str
    budget: BudgetSchema
    timeline: TimelineSchema


# ---------------------------------------------------------------------------
# AI Report schema
# ---------------------------------------------------------------------------

class AIReportSchema(BaseModel):
    project_id: int
    confidence_score: float
    label: str
    detail: str
    bounding_box_image: str
    detected_objects: list[DetectedObject]
    last_analyzed: str


# ---------------------------------------------------------------------------
# Community Report schemas
# ---------------------------------------------------------------------------

class CommunityReportCreate(BaseModel):
    """Body accepted when a user submits a community report from the frontend."""
    status_reported: str = Field(
        ...,
        description="Status as reported by the community member",
        examples=["Active", "Abandoned", "Completed"],
    )
    message: Optional[str] = Field(None, description="Optional free-text comment")
    reporter_contact: Optional[str] = Field(None, description="Optional contact (phone/email)")


class CommunityReportResponse(BaseModel):
    status: str
    message: str
    report_id: str


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    environment: str
    timestamp: str
