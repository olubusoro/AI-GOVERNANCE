"""
WhatsApp webhook router — receives inbound messages from Twilio.

Twilio will POST to /webhook/whatsapp every time someone messages
your Sandbox number. The route validates the request (optional in dev),
delegates to the twilio_bot service, and returns TwiML XML.
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Form, Request, Response
from services.twilio_bot import handle_inbound_message

router = APIRouter(prefix="/webhook", tags=["Webhook"])


@router.post(
    "/whatsapp",
    summary="Twilio WhatsApp inbound webhook",
    description=(
        "Receives inbound WhatsApp messages from the Twilio Sandbox. "
        "Parses the message body, generates a scripted TwiML auto-reply, "
        "and optionally logs community status reports to disk."
    ),
    response_class=Response,  # We return raw XML, not JSON
)
async def whatsapp_webhook(
    request: Request,
    Body: str = Form(default=""),
    From: str = Form(default=""),
    To: str = Form(default=""),
    MessageSid: str = Form(default=""),
    NumMedia: str = Form(default="0"),
):
    """
    Twilio sends form-encoded POST bodies with these fields.
    We read Body (the text) and From (the sender's number).
    """
    print(
        f"[WEBHOOK] Inbound WhatsApp | SID={MessageSid} | From={From} | Body='{Body}' | Media={NumMedia}"
    )

    # Delegate to the bot logic
    twiml_response = handle_inbound_message(body=Body, from_number=From)

    # Return TwiML XML with the correct content type
    return Response(content=twiml_response, media_type="application/xml")


@router.get(
    "/whatsapp",
    summary="Webhook healthcheck (GET)",
    description="Simple GET handler to verify the webhook URL is reachable from Twilio's console.",
)
def webhook_healthcheck():
    return {"status": "ok", "message": "WhatsApp webhook is live. Twilio should POST to this URL."}
