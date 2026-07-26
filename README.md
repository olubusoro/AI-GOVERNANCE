# COUCH AI Infrastructure Tracker

An AI-powered e-governance tracker for monitoring Nigerian public infrastructure projects in real time.  
Built for the COUCH Submission MVP — a 72-hour hackathon sprint.

---

## Project Structure

```
/
├── backend/          FastAPI backend — REST API + Twilio WhatsApp bot
├── frontend/         Next.js 14 frontend — dashboard with interactive Leaflet map
├── ai_scripts/       YOLOv8 local satellite image inference scripts
├── render.yaml       Render.com deployment config
└── .gitignore
```

---

## Backend Setup

### Prerequisites
- Python 3.10+
- pip

### 1. Navigate to the backend directory
```bash
cd backend
```

### 2. Create and activate a virtual environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

> ⚠️ `ultralytics` (YOLOv8) requires PyTorch (~800MB). If you're on a low-resource machine, you can skip it — the API uses pre-computed AI results from `data/ai_results.json` by default.

### 4. Configure environment variables
```bash
cp .env.example .env
# Edit .env and fill in your Twilio credentials
```

### 5. Start the API server
```bash
uvicorn main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/projects` | List all projects (map pins) |
| `GET` | `/api/projects/{id}` | Project detail (side panel) |
| `GET` | `/api/projects/{id}/ai-report` | AI confidence score + bounding box |
| `POST` | `/api/projects/{id}/report` | Submit a community report |
| `POST` | `/webhook/whatsapp` | Twilio WhatsApp inbound webhook |

---

## Twilio WhatsApp Bot Setup

1. Sign up at [twilio.com](https://www.twilio.com) and activate the **WhatsApp Sandbox**
2. Fill in `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` in your `.env`
3. Expose your local server using [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 8000
   ```
4. In the Twilio Sandbox settings, set the **When a message comes in** webhook URL to:
   ```
   https://<your-ngrok-id>.ngrok.io/webhook/whatsapp
   ```
5. Text `"Project 102"` from your phone to the Twilio sandbox number to test the bot

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:3000`

---

## AI Scripts (Local Satellite Image Analysis)

```bash
cd ai_scripts
pip install -r requirements.txt
# Add sample satellite images to ai_scripts/input_images/
python generate_boxes.py
# Annotated output saved to ai_scripts/output_images/
```

---

## Deployment (Render)

This repo includes a `render.yaml` for one-click deployment to [Render](https://render.com):

1. Push this repo to GitHub
2. Go to [render.com/new](https://render.com/new) → "New Web Service" → connect your GitHub repo
3. Render auto-detects `render.yaml`
4. Add your Twilio secrets in the Render dashboard under **Environment**
5. Deploy — your API will be live at `https://couch-tracker-api.onrender.com`
6. Update the Twilio Sandbox webhook URL to your Render URL

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI |
| Server | Uvicorn (ASGI) |
| AI / Object Detection | YOLOv8 (Ultralytics) |
| Image Processing | Pillow |
| WhatsApp Bot | Twilio Python SDK |
| Data Storage | JSON files (no database — MVP constraint) |
| Testing | pytest + pytest-asyncio + httpx |
| Frontend | Next.js 14 + Tailwind CSS + Leaflet |
| Deployment | Render (backend) / Vercel (frontend) |
