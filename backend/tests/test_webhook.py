"""
Tests for the /webhook/whatsapp endpoint and twilio_bot service logic.
"""
import pytest
from httpx import AsyncClient, ASGITransport

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app
from services.twilio_bot import parse_message, build_twiml_response, handle_inbound_message


# ---------------------------------------------------------------------------
# Unit tests for parse_message
# ---------------------------------------------------------------------------

def test_parse_project_query_long_form():
    result = parse_message("Project 102")
    assert result["intent"] == "project_query"
    assert result["project_id"] == 102


def test_parse_project_query_short_form():
    result = parse_message("P2")
    assert result["intent"] == "project_query"
    assert result["project_id"] == 2


def test_parse_status_reply_digit_1():
    result = parse_message("1")
    assert result["intent"] == "status_reply"
    assert result["status_digit"] == "1"


def test_parse_status_reply_digit_2():
    result = parse_message("2.")
    assert result["intent"] == "status_reply"
    assert result["status_digit"] == "2"


def test_parse_unknown_message():
    result = parse_message("Hello, what is this?")
    assert result["intent"] == "unknown"


# ---------------------------------------------------------------------------
# Unit tests for build_twiml_response
# ---------------------------------------------------------------------------

def test_twiml_response_is_valid_xml():
    xml = build_twiml_response("Hello!")
    assert xml.startswith("<?xml")
    assert "<Response>" in xml
    assert "<Message>Hello!</Message>" in xml
    assert "</Response>" in xml


def test_twiml_response_escapes_ampersand():
    xml = build_twiml_response("Projects & Reports")
    assert "&amp;" in xml


# ---------------------------------------------------------------------------
# Integration tests for the webhook endpoint
# ---------------------------------------------------------------------------

@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_webhook_get_healthcheck():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/webhook/whatsapp")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.anyio
async def test_webhook_post_project_query():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/webhook/whatsapp",
            data={"Body": "Project 102", "From": "whatsapp:+2348012345678", "To": "whatsapp:+14155238886", "MessageSid": "TEST123", "NumMedia": "0"},
        )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    assert b"<Response>" in response.content
    assert b"<Message>" in response.content


@pytest.mark.anyio
async def test_webhook_post_unknown_message():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/webhook/whatsapp",
            data={"Body": "random text here", "From": "whatsapp:+2348099999999", "To": "whatsapp:+14155238886", "MessageSid": "TEST456", "NumMedia": "0"},
        )
    assert response.status_code == 200
    assert b"<Response>" in response.content
