"""
Projects router — all /api/projects endpoints.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, status
from models.schemas import (
    AIReportSchema,
    CommunityReportCreate,
    CommunityReportResponse,
    ProjectDetail,
    ProjectSummary,
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])

# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PROJECTS_PATH = os.path.join(BASE_DIR, "mock_data", "projects.json")
AI_RESULTS_PATH = os.path.join(BASE_DIR, "data", "ai_results.json")
REPORTS_PATH = os.path.join(BASE_DIR, "data", "reports.json")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_json(path: str, data) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _get_project_by_id(project_id: int) -> dict:
    projects = _load_json(PROJECTS_PATH)
    for project in projects:
        if project["id"] == project_id:
            return project
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Project with id={project_id} not found.",
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=List[ProjectSummary],
    summary="List all projects",
    description="Returns a summary list of all tracked infrastructure projects. Used to render map pins.",
)
def list_projects():
    projects = _load_json(PROJECTS_PATH)
    return projects


@router.get(
    "/{project_id}",
    response_model=ProjectDetail,
    summary="Get project detail",
    description="Returns full detail for a single project including budget breakdown and timeline. Used for the side-panel view.",
)
def get_project(project_id: int):
    return _get_project_by_id(project_id)


@router.get(
    "/{project_id}/ai-report",
    response_model=AIReportSchema,
    summary="Get AI analysis report",
    description="Returns the AI confidence score, detection label, detected objects, and annotated bounding box image URL for a project.",
)
def get_ai_report(project_id: int):
    # Confirm the project exists first
    _get_project_by_id(project_id)

    ai_results = _load_json(AI_RESULTS_PATH)
    result = ai_results.get(str(project_id))
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No AI analysis results found for project id={project_id}.",
        )
    return result


@router.post(
    "/{project_id}/report",
    response_model=CommunityReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a community report",
    description="Accepts a community ground-truth report for a project. Appends the report to the local reports log.",
)
def submit_community_report(project_id: int, body: CommunityReportCreate):
    # Confirm the project exists
    _get_project_by_id(project_id)

    reports = _load_json(REPORTS_PATH)

    new_report = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "source": "frontend_form",
        "status_reported": body.status_reported,
        "message": body.message,
        "reporter_contact": body.reporter_contact,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    reports.append(new_report)
    _save_json(REPORTS_PATH, reports)

    return CommunityReportResponse(
        status="logged",
        message=f"Thank you! Your report for project {project_id} has been recorded.",
        report_id=new_report["id"],
    )
