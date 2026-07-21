"""
extract_trip_details.py – Extracts structured trip info from a natural-language prompt.

Designed as a standalone MCP-compatible tool: it takes a single user message
and returns origin, destination, and departure_time.  The extraction logic is
completely isolated from route planning and recommendation logic.
"""

import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-3.5-flash"

# Prompt instructs Gemini to output only a JSON object.
# today's date is injected at call-time so relative references
# like "tomorrow" resolve correctly.
_EXTRACTION_PROMPT_TEMPLATE = """\
Today is {today}.

Extract the trip details from the user message below.
Return a JSON object with exactly these keys:
  "origin"         – the starting location (string or null)
  "destination"    – the destination location (string or null)
  "departure_time" – ISO 8601 datetime string (e.g. "2026-07-10T07:00:00") or null

Rules:
- If the user mentions a relative day ("tomorrow", "next Monday", etc.) resolve it against today's date.
- If a time is not specified, default to 08:00:00 on the departure date.
- Return ONLY the JSON object, no markdown, no explanation.

User message: {user_prompt}"""


class ExtractionError(Exception):
    """Raised when trip details cannot be extracted from the prompt."""


def _build_extraction_prompt(user_prompt: str) -> str:
    """Inject today's date into the extraction prompt template."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return _EXTRACTION_PROMPT_TEMPLATE.format(today=today, user_prompt=user_prompt)


def _call_gemini(prompt: str) -> str:
    """Send the prompt to Gemini and return the raw text response."""
    if not GEMINI_API_KEY:
        raise ExtractionError("GEMINI_API_KEY is not configured")

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise ExtractionError("google-genai is not installed") from exc

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            # Force JSON-only output; no markdown fences
            response_mime_type="application/json",
        ),
    )
    return getattr(response, "text", "") or ""


def extract_trip_details(user_prompt: str) -> dict:
    """
    Parse a natural-language travel prompt and return structured trip details.

    Args:
        user_prompt: The user's message, e.g.
            "I'm driving from Delhi to Manali tomorrow at 7 AM."

    Returns:
        A dict with keys:
            "origin"         – str | None
            "destination"    – str | None
            "departure_time" – datetime | None

    Raises:
        ExtractionError: If Gemini is unavailable or returns unparseable output.
    """
    prompt = _build_extraction_prompt(user_prompt)
    raw = _call_gemini(prompt)

    # Strip accidental markdown fences if the model ignores the mime-type hint
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ExtractionError(f"Gemini returned non-JSON output: {raw!r}") from exc

    # Parse departure_time string → datetime
    departure_time: datetime | None = None
    raw_dt = data.get("departure_time")
    if raw_dt:
        try:
            departure_time = datetime.fromisoformat(str(raw_dt).replace("Z", "+00:00"))
        except ValueError:
            departure_time = None

    return {
        "origin": data.get("origin") or None,
        "destination": data.get("destination") or None,
        "departure_time": departure_time,
    }
