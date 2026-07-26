"""
AI Service — wraps YOLOv8 inference for satellite image analysis.

This service can be used in two modes:
  1. Live inference: Runs YOLOv8 on a given image file on-demand.
  2. Pre-computed: Reads from data/ai_results.json (default for demo MVP
     to avoid loading the model on every request).

The demo MVP uses mode 2.  Mode 1 is available via the /run-inference
admin endpoint (not exposed publicly).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
AI_RESULTS_PATH = BASE_DIR / "data" / "ai_results.json"
STATIC_IMAGES_DIR = BASE_DIR / "static" / "images"


# ---------------------------------------------------------------------------
# Pre-computed result lookup (used by the main API)
# ---------------------------------------------------------------------------

def get_ai_result(project_id: int) -> dict | None:
    """
    Return the pre-computed AI analysis result for the given project_id.
    Returns None if no result exists.
    """
    try:
        with open(AI_RESULTS_PATH, "r", encoding="utf-8") as f:
            results = json.load(f)
        return results.get(str(project_id))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


# ---------------------------------------------------------------------------
# Live inference (optional — requires ultralytics + torch installed)
# ---------------------------------------------------------------------------

def run_inference(image_path: str, project_id: int) -> dict:
    """
    Run YOLOv8 inference on an image and return detection results.

    Args:
        image_path: Absolute path to the input satellite image.
        project_id: Project ID — used to name the output annotated image.

    Returns:
        A dict with confidence_score, label, detected_objects, and
        bounding_box_image path relative to /static/.

    Raises:
        ImportError: if ultralytics is not installed.
        FileNotFoundError: if image_path does not exist.
    """
    try:
        from ultralytics import YOLO  # type: ignore[import]
    except ImportError as exc:
        raise ImportError(
            "ultralytics is not installed. Run: pip install ultralytics>=8.2.0"
        ) from exc

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    # Load YOLOv8 nano model (downloads ~6MB weights on first run)
    model = YOLO("yolov8n.pt")
    results = model(image_path, save=False, verbose=False)

    # Aggregate detections
    detected_objects = []
    total_confidence = 0.0
    count = 0

    for result in results:
        for box in result.boxes:
            class_name = model.names[int(box.cls[0])]
            conf = float(box.conf[0])
            detected_objects.append(
                {"class": class_name, "count": 1, "confidence": round(conf, 3)}
            )
            total_confidence += conf
            count += 1

    confidence_score = round((total_confidence / count * 100) if count > 0 else 0.0, 1)

    # Save annotated image
    output_path = generate_annotated_image(image_path, project_id)

    label = _score_to_label(confidence_score, count)

    return {
        "project_id": project_id,
        "confidence_score": confidence_score,
        "label": label,
        "detail": f"{count} object(s) detected with average confidence {confidence_score}%.",
        "bounding_box_image": f"/static/images/project{project_id}_bbox.jpg",
        "detected_objects": detected_objects,
        "last_analyzed": _utc_now(),
    }


def generate_annotated_image(image_path: str, project_id: int) -> str:
    """
    Run YOLOv8 on image_path, draw bounding boxes, and save the result
    to static/images/project{project_id}_bbox.jpg.

    Returns the absolute output path.
    """
    try:
        from ultralytics import YOLO
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as exc:
        raise ImportError(
            "ultralytics and Pillow are required. Run: pip install ultralytics Pillow"
        ) from exc

    STATIC_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    output_path = STATIC_IMAGES_DIR / f"project{project_id}_bbox.jpg"

    model = YOLO("yolov8n.pt")
    results = model(image_path, save=False, verbose=False)

    # Plot annotated frame using ultralytics built-in renderer
    annotated_frame = results[0].plot()

    # Convert numpy array (BGR) to PIL Image and save
    from PIL import Image as PILImage
    import numpy as np

    img = PILImage.fromarray(annotated_frame[..., ::-1])  # BGR -> RGB
    img.save(str(output_path), "JPEG", quality=90)

    return str(output_path)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _score_to_label(score: float, detection_count: int) -> str:
    if detection_count == 0:
        return "No objects detected"
    if score >= 80:
        return "Construction activity detected"
    if score >= 40:
        return "Partial activity detected"
    return "No recent construction activity"


def _utc_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
