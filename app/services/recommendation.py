import os
from datetime import datetime, timezone

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-3.5-flash"


def build_recommendation_prompt(user_query, route_summary, risk_summary):
    """Create a concise structured prompt for Gemini without sending raw geometry.

    You are a concise routing and safety assistant.

    System Instructions:
    - Respond ONLY in bullet points.
    - Focus strictly on key, high-priority information (major risks, core transit stats, direct answers).
    - Omit unnecessary fluff or non-critical details.

    Context Data:
    - Route Summary: {route_summary}
    - Risk Summary: {risk_summary}

    User Query:
    {user_query}"""
    distance_km = route_summary.get("distance_km", 0)
    distance_text = f"{float(distance_km):.1f} km" if distance_km is not None else "unknown"
    duration_min = route_summary.get("duration_min", 0)
    duration_text = f"{int(duration_min)} min" if duration_min is not None else "unknown"

    # ------------------------------------------------------------------ #
    # Normalise risk_summary: accept both the new list format from        #
    # build_risk_summary() and the legacy flat-dict format.               #
    # ------------------------------------------------------------------ #
    if isinstance(risk_summary, list):
        # Derive aggregate values from the per-waypoint list
        all_hazards: list = []
        risk_levels_order = ["EXTREME", "HIGH", "MODERATE", "LOW", "SAFE", "UNKNOWN"]
        highest_risk = "SAFE"
        segments = risk_summary  # each item is a segment/waypoint

        for point in risk_summary:
            for hazard in point.get("hazards", []):
                if hazard not in all_hazards:
                    all_hazards.append(hazard)
            point_risk = point.get("risk", "UNKNOWN")
            if risk_levels_order.index(point_risk) < risk_levels_order.index(highest_risk):
                highest_risk = point_risk

        risk_level = highest_risk
        hazards = all_hazards
        # Use the weather description of the most dangerous point for the summary line
        worst_point = max(
            risk_summary,
            key=lambda p: risk_levels_order.index(p.get("risk", "UNKNOWN")),
            default={},
        )
        weather_description = worst_point.get("weather", "Unknown")
    else:
        # Legacy flat-dict format
        segments = route_summary.get("segments", []) or []
        risk_level = risk_summary.get("risk_level", "UNKNOWN")
        hazards = risk_summary.get("hazards", []) or []
        weather_description = risk_summary.get("weather_description", "Unknown")

    # Build segment/waypoint lines for the prompt
    segment_lines = []
    for segment in segments:
        name = segment.get("location") or segment.get("name", "Segment")
        eta = segment.get("eta", "unknown")
        risk = segment.get("risk", "")
        hazards_here = ", ".join(segment.get("hazards", [])) if segment.get("hazards") else "None"
        segment_lines.append(f"- {name}: ETA {eta}, Risk {risk}, Hazards: {hazards_here}")

    if not segment_lines:
        segment_lines.append("- No segment details provided")

    hazards_text = ", ".join(hazards) if hazards else "None"

    return (
        "You are a concise travel safety assistant. "
        f"User query: {user_query}\n"
        f"Route distance: {distance_text}\n"
        f"Estimated travel duration: {duration_text}\n"
        f"Route segments:\n" + "\n".join(segment_lines) + "\n"
        f"Overall risk level: {risk_level}\n"
        f"Hazards: {hazards_text}\n"
        f"Weather description: {weather_description}\n"
        "Write a brief travel recommendation under 50 words. "
        "Summarize the journey, explain hazardous locations, recommend safe driving precautions, mention high-risk segments, and say whether delaying departure may help if severe weather exists."
    )



def _call_gemini_model(prompt):
    """Call the Gemini API if the SDK and key are available."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")

    try:
        from google import genai
    except ImportError as exc:
        raise RuntimeError("google-genai is not installed") from exc

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )
    return getattr(response, "text", "") or ""


def generate_recommendation(user_query, route_summary, risk_summary):
    """Generate a concise AI recommendation from route and risk context."""
    prompt = build_recommendation_prompt(user_query, route_summary, risk_summary)

    try:
        recommendation_text = _call_gemini_model(prompt)
    except Exception as exc:
        recommendation_text = (
            "Travel cautiously and monitor weather updates. "
            f"High-risk segments and hazardous conditions warrant extra attention. {exc}"
        )

    return {
        "recommendation": recommendation_text.strip() or "Travel cautiously and monitor changing conditions.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": MODEL_NAME,
    }
