from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.services.eta import estimate_eta
from app.services.weather import fetch_hourly_weather_batch, get_weather_for_route
from app.services.risk import analyze_route_risk
from app.services.summary import build_risk_summary

RISK_LEVEL_ORDER = {
    "SAFE": 1,
    "LOW": 2,
    "MODERATE": 3,
    "HIGH": 4,
    "EXTREME": 5,
    "UNKNOWN": 0,
}


def _parse_datetime(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def compute_risk_timeline(
    sample_points: List[Dict[str, Any]],
    total_distance_km: float,
    total_duration_min: float,
    base_departure_time: Any,
    max_hours: int = 24,
    step_hours: int = 1,
    hourly_batch: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Compute route risk snapshots across future departure hours (e.g. +0h to +24h).

    Returns a payload containing:
      - timeline: List of hourly risk snapshots
      - best_departure: Details of the recommended departure window
    """
    if not sample_points:
        return {"timeline": [], "best_departure": None}

    base_dt = _parse_datetime(base_departure_time)

    # Fetch raw hourly weather once if not already provided
    if hourly_batch is None:
        hourly_batch = fetch_hourly_weather_batch(sample_points, forecast_days=3)

    timeline = []

    for offset_h in range(0, max_hours + 1, step_hours):
        shifted_dt = base_dt + timedelta(hours=offset_h)

        # Estimate ETAs for this shifted departure time
        shifted_points = estimate_eta(
            sample_points=sample_points,
            total_distance_km=total_distance_km,
            total_duration_min=total_duration_min,
            departure_time=shifted_dt,
        )

        # Attach weather for shifted ETAs using pre-fetched hourly batch
        points_with_weather = get_weather_for_route(
            shifted_points, forecast_days=3, hourly_batch=hourly_batch
        )

        # Analyze risk per point
        points_with_risk = analyze_route_risk(points_with_weather)

        # Build compact risk summary
        risk_summary = build_risk_summary(points_with_risk)

        # Aggregate overall metrics for this departure offset
        max_score = 0
        overall_level = "SAFE"
        unique_hazards = []

        for p, wr in zip(risk_summary, points_with_risk):
            score = wr.get("risk", {}).get("score", 0)
            level = p.get("risk", "SAFE")
            if score > max_score:
                max_score = score
            if RISK_LEVEL_ORDER.get(level, 0) > RISK_LEVEL_ORDER.get(overall_level, 0):
                overall_level = level

            for h in p.get("hazards", []):
                if h not in unique_hazards:
                    unique_hazards.append(h)

        timeline.append({
            "offset_hours": offset_h,
            "departure_time": shifted_dt.isoformat(),
            "overall_risk": overall_level,
            "max_risk_score": max_score,
            "hazards": unique_hazards,
            "risk_summary": risk_summary,
        })

    # Determine best departure time window
    best_entry = min(timeline, key=lambda entry: (entry["max_risk_score"], entry["offset_hours"]))
    initial_entry = timeline[0] if timeline else None

    if not initial_entry:
        best_departure = None
    elif best_entry["offset_hours"] == 0:
        best_departure = {
            "offset_hours": 0,
            "departure_time": initial_entry["departure_time"],
            "overall_risk": initial_entry["overall_risk"],
            "max_risk_score": initial_entry["max_risk_score"],
            "reason": "Leaving at your planned time is optimal. Route risk is at its minimum.",
        }
    else:
        score_diff = initial_entry["max_risk_score"] - best_entry["max_risk_score"]
        reason = (
            f"Leaving in +{best_entry['offset_hours']} hours lowers maximum route risk from "
            f"{initial_entry['overall_risk']} ({initial_entry['max_risk_score']} pts) to "
            f"{best_entry['overall_risk']} ({best_entry['max_risk_score']} pts)."
        )
        if score_diff > 0:
            reason += f" Reduces risk score by {score_diff} points."

        best_departure = {
            "offset_hours": best_entry["offset_hours"],
            "departure_time": best_entry["departure_time"],
            "overall_risk": best_entry["overall_risk"],
            "max_risk_score": best_entry["max_risk_score"],
            "reason": reason,
        }

    return {
        "timeline": timeline,
        "best_departure": best_departure,
    }
