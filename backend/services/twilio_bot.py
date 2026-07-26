"""
Twilio WhatsApp auto-responder logic.

Flow:
  1. User texts a project code (e.g. "Project 102", "P2", "status")
  2. Bot replies with the scripted prompt asking for a status update
     and stores the project_id in Redis (TTL: 10 minutes)
  3. User replies with "1", "2", or "3"
  4. Bot reads the stored project_id from Redis, logs the status report
     with the correct project_id, clears the session, and confirms receipt

TwiML (Twilio Markup Language) is returned as XML so Twilio knows
what to say/send back to the user.

Redis session keys:
  session:<whatsapp_number>  →  project_id (int, TTL 10 min)
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

# ---------------------------------------------------------------------------
# Project code parsing helpers
# ---------------------------------------------------------------------------

# Recognise patterns like: "Project 102", "P102", "project1", "#2", "2"
_PROJECT_CODE_PATTERN = re.compile(
    r"(?:project\s*#?|p#?)(\d+)|^#?(\d+)$",
    re.IGNORECASE,
)

# Recognise a status reply: "1", "2", "3" (optionally with period or dot)
_STATUS_REPLY_PATTERN = re.compile(r"^([123])\.?$")

# Map status number → human-readable label
STATUS_MAP = {
    "1": "Active",
    "2": "Abandoned",
    "3": "Completed",
}

# Session TTL: 10 minutes (in seconds)
_SESSION_TTL = 600

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
REPORTS_PATH = os.path.join(BASE_DIR, "data", "reports.json")


# ---------------------------------------------------------------------------
# Redis session helpers
# ---------------------------------------------------------------------------

def _get_redis():
    """
    Return an Upstash Redis client if credentials are configured,
    otherwise return None (graceful stateless fallback).
    """
    url = os.getenv("UPSTASH_REDIS_REST_URL", "").strip()
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN", "").strip()

    if not url or not token or url.startswith("https://your-db"):
        return None

    try:
        from upstash_redis import Redis  # type: ignore[import]
        return Redis(url=url, token=token)
    except Exception:
        return None


def _session_key(from_number: str) -> str:
    """Build a Redis key from the sender's WhatsApp number."""
    # Sanitise: keep only alphanumeric and + for the key
    safe = re.sub(r"[^a-zA-Z0-9+]", "_", from_number)
    return f"session:{safe}"


def _save_session(from_number: str, project_id: int) -> None:
    """Store project_id for this sender with a 10-minute TTL."""
    redis = _get_redis()
    if redis is None:
        return
    try:
        redis.set(_session_key(from_number), str(project_id), ex=_SESSION_TTL)
    except Exception as exc:
        print(f"[REDIS] Failed to save session for {from_number}: {exc}")


def _get_session(from_number: str) -> Optional[int]:
    """Retrieve the stored project_id for this sender, or None if expired/missing."""
    redis = _get_redis()
    if redis is None:
        return None
    try:
        value = redis.get(_session_key(from_number))
        return int(value) if value is not None else None
    except Exception as exc:
        print(f"[REDIS] Failed to get session for {from_number}: {exc}")
        return None


def _clear_session(from_number: str) -> None:
    """Delete the session key once a status has been reported."""
    redis = _get_redis()
    if redis is None:
        return
    try:
        redis.delete(_session_key(from_number))
    except Exception as exc:
        print(f"[REDIS] Failed to clear session for {from_number}: {exc}")


# ---------------------------------------------------------------------------
# Core parsing + response builders
# ---------------------------------------------------------------------------

def parse_message(body: str) -> dict:
    """
    Parse an inbound WhatsApp message body.

    Returns a dict with keys:
      - intent: "project_query" | "status_reply" | "unknown"
      - project_id: int | None
      - status_digit: str | None  ("1", "2", or "3")
    """
    body = body.strip()

    # Check for status reply first (short single-digit messages)
    status_match = _STATUS_REPLY_PATTERN.match(body)
    if status_match:
        return {"intent": "status_reply", "project_id": None, "status_digit": status_match.group(1)}

    # Check for project code mention
    code_match = _PROJECT_CODE_PATTERN.search(body)
    if code_match:
        raw_id = code_match.group(1) or code_match.group(2)
        return {"intent": "project_query", "project_id": int(raw_id), "status_digit": None}

    return {"intent": "unknown", "project_id": None, "status_digit": None}


def build_twiml_response(message: str) -> str:
    """Wrap a plain-text message in a TwiML <Response><Message> envelope."""
    # Escape XML special characters
    safe = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"<Message>{safe}</Message>"
        "</Response>"
    )


# ---------------------------------------------------------------------------
# Main handler — called from the webhook route
# ---------------------------------------------------------------------------

def handle_inbound_message(body: str, from_number: str) -> str:
    """
    Process an inbound WhatsApp message and return TwiML XML.

    Args:
        body:        The raw text of the incoming message.
        from_number: The sender's WhatsApp number (e.g. "whatsapp:+2348012345678").

    Returns:
        TwiML XML string to send back to Twilio.
    """
    parsed = parse_message(body)
    intent = parsed["intent"]

    # --- Intent: user mentioned a project code ---
    if intent == "project_query":
        project_id = parsed["project_id"]
        _save_session(from_number, project_id)
        reply = (
            "👋 Welcome to the COUCH Infrastructure Tracker!\n\n"
            f"You're checking on Project {project_id}.\n\n"
            "Please reply with the current status:\n"
            "1️⃣  Active — work is ongoing\n"
            "2️⃣  Abandoned — no activity visible\n"
            "3️⃣  Completed — project is finished\n\n"
            "Reply with 1, 2, or 3."
        )
        return build_twiml_response(reply)

    # --- Intent: user replied with a status digit ---
    if intent == "status_reply":
        digit = parsed["status_digit"]
        status_label = STATUS_MAP[digit]

        # Retrieve which project this user was asking about
        project_id = _get_session(from_number)

        if project_id is None:
            # No active session — ask them to start over
            reply = (
                "⚠️ It looks like your session expired or you haven't selected a project yet.\n\n"
                "Please start by sending a project code, e.g.:\n"
                "   'Project 102' or 'P1'\n\n"
                "Then reply with 1, 2, or 3."
            )
            return build_twiml_response(reply)

        _log_whatsapp_report(from_number, project_id, status_label)
        _clear_session(from_number)

        reply = (
            f"✅ Report received! Status '{status_label}' logged for Project {project_id}.\n\n"
            "Thank you for helping track this project. Your report contributes to "
            "COUCH's real-time governance data.\n\n"
            "🔗 View the dashboard: https://couch-tracker.onrender.com"
        )
        return build_twiml_response(reply)

    # --- Unknown / unrecognised message ---
    reply = (
        "👋 Hi! I'm the COUCH Infrastructure Tracker bot.\n\n"
        "To check on a project, send a message like:\n"
        "   'Project 102' or 'P1'\n\n"
        "I'll ask you to confirm its current status. Together we keep "
        "government projects accountable. 🇳🇬"
    )
    return build_twiml_response(reply)


# ---------------------------------------------------------------------------
# Private: log a WhatsApp-sourced report to disk
# ---------------------------------------------------------------------------

def _log_whatsapp_report(from_number: str, project_id: Optional[int], status_label: str) -> None:
    """Append a new WhatsApp-sourced community report to reports.json."""
    try:
        with open(REPORTS_PATH, "r", encoding="utf-8") as f:
            reports = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        reports = []

    new_report = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "source": "whatsapp",
        "from_number": from_number,
        "status_reported": status_label,
        "message": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    reports.append(new_report)

    with open(REPORTS_PATH, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, ensure_ascii=False)
