"""
Tests for /api/projects endpoints.
"""
import json
import pytest
from httpx import AsyncClient, ASGITransport

import sys
import os

# Make sure we can import the app from the backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


@pytest.mark.anyio
async def test_list_projects_returns_all():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/projects")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3


@pytest.mark.anyio
async def test_list_projects_schema():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/projects")
    projects = response.json()
    first = projects[0]
    assert "id" in first
    assert "name" in first
    assert "status" in first
    assert "location" in first
    assert "lat" in first["location"]
    assert "ai_analysis" in first
    assert "confidence_score" in first["ai_analysis"]


@pytest.mark.anyio
async def test_get_single_project():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/projects/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert "budget" in data
    assert "official_usd" in data["budget"]
    assert "timeline" in data


@pytest.mark.anyio
async def test_get_nonexistent_project_returns_404():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/projects/999")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_get_ai_report():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/projects/2/ai-report")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == 2
    assert "confidence_score" in data
    assert "label" in data
    assert "bounding_box_image" in data


@pytest.mark.anyio
async def test_submit_community_report(tmp_path, monkeypatch):
    """Test that submitting a report returns 201 and a report_id."""
    # Point reports path to a temp file to avoid polluting real data
    temp_reports = tmp_path / "reports.json"
    temp_reports.write_text("[]", encoding="utf-8")

    import routers.projects as proj_router
    monkeypatch.setattr(proj_router, "REPORTS_PATH", str(temp_reports))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/projects/1/report",
            json={"status_reported": "Active", "message": "Lots of activity!"},
        )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "logged"
    assert "report_id" in data

    # Verify the report was written
    written = json.loads(temp_reports.read_text(encoding="utf-8"))
    assert len(written) == 1
    assert written[0]["status_reported"] == "Active"
