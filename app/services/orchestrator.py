"""
Orchestrator: coordinates all services in the AI Travel Assistant pipeline.

Execution order:
  1. Geocode origin
  2. Geocode destination
  3. Get driving route
  4. Sample the route into waypoints
  5. Estimate ETA for each waypoint
  6. Fetch weather for each waypoint
  7. Analyze travel risk for each waypoint
  8. Build compact route summary
  9. Build compact risk summary
  10. Generate AI recommendation via Gemini
  11. Return one consolidated response

Each step calls the underlying service function directly — no internal HTTP
requests are made.  This design makes every step independently testable and
keeps the module ready for future conversion to an MCP-tool architecture,
where each service can become a standalone MCP Tool without changing its
internal implementation.
"""

from datetime import datetime
from typing import Any, Dict

from app.services.geocoder import geocode
from app.services.routing import get_route
from app.services.sampler import sample_route
from app.services.eta import estimate_eta
from app.services.weather import get_weather_for_route
from app.services.risk import analyze_route_risk
from app.services.summary import build_route_summary, build_risk_summary
from app.services.recommendation import generate_recommendation


class TripProcessingError(Exception):
    """Raised when the orchestrator cannot complete the pipeline."""

    def __init__(self, message: str, step: str) -> None:
        super().__init__(message)
        self.step = step


def process_trip(
    user_query: str,
    origin: str,
    destination: str,
    departure_time: datetime,
    interval_km: float = 25,
) -> Dict[str, Any]:
    """
    Execute the full trip-planning pipeline and return a consolidated response.

    Args:
        user_query:     The user's natural-language question / request.
        origin:         Human-readable origin name (e.g. "Delhi").
        destination:    Human-readable destination name (e.g. "Manali").
        departure_time: Planned departure as a timezone-aware or naive datetime.
        interval_km:    Sampling interval in km for route waypoints (default 25).

    Returns:
        A dict containing route_summary, risk_summary, recommendation,
        and route_geometry.

    Raises:
        TripProcessingError: If any required step in the pipeline fails.
    """

    # ------------------------------------------------------------------
    # Step 1 – Geocode origin
    # ------------------------------------------------------------------
    origin_location = geocode(origin)
    if origin_location is None:
        raise TripProcessingError(f"Could not geocode origin: {origin!r}", step="geocode_origin")

    # ------------------------------------------------------------------
    # Step 2 – Geocode destination
    # ------------------------------------------------------------------
    destination_location = geocode(destination)
    if destination_location is None:
        raise TripProcessingError(
            f"Could not geocode destination: {destination!r}", step="geocode_destination"
        )

    # ------------------------------------------------------------------
    # Step 3 – Get driving route
    # ------------------------------------------------------------------
    route_data = get_route(origin_location, destination_location)

    if route_data.get("geometry") is None:
        warning = route_data.get("warning", "No route found")
        raise TripProcessingError(warning, step="routing")

    # ------------------------------------------------------------------
    # Step 4 – Sample the route into evenly-spaced waypoints
    # ------------------------------------------------------------------
    sampled_points = sample_route(route_data, interval_km=interval_km)

    # ------------------------------------------------------------------
    # Step 5 – Estimate ETA for each sampled waypoint
    # ------------------------------------------------------------------
    points_with_eta = estimate_eta(
        sample_points=sampled_points,
        total_distance_km=route_data["distance_km"],
        total_duration_min=route_data["duration_min"],
        departure_time=departure_time,
    )

    # ------------------------------------------------------------------
    # Step 6 – Fetch weather for each waypoint
    # ------------------------------------------------------------------
    points_with_weather = get_weather_for_route(points_with_eta)

    # ------------------------------------------------------------------
    # Step 7 – Analyze travel risk for each waypoint
    # ------------------------------------------------------------------
    points_with_risk = analyze_route_risk(points_with_weather)

    # ------------------------------------------------------------------
    # Step 8 – Build compact route summary (strips raw geometry)
    # ------------------------------------------------------------------
    route_summary = build_route_summary(route_data, origin=origin, destination=destination)

    # ------------------------------------------------------------------
    # Step 9 – Build compact risk summary (strips raw weather payloads)
    # ------------------------------------------------------------------
    risk_summary = build_risk_summary(points_with_risk)

    # ------------------------------------------------------------------
    # Step 10 – Generate AI recommendation using Gemini
    # ------------------------------------------------------------------
    recommendation = generate_recommendation(
        user_query=user_query,
        route_summary=route_summary,
        risk_summary=risk_summary,
    )

    # ------------------------------------------------------------------
    # Step 11 – Return consolidated response
    # ------------------------------------------------------------------
    return {
        "route_summary": route_summary,
        "risk_summary": risk_summary,
        "recommendation": recommendation,
        "route_geometry": route_data.get("geometry"),
    }
