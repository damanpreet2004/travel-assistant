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


def _format_time_offset_desc(minutes: int) -> str:
    """Format minutes into human readable offset text (e.g. 45 min, 1 hour, 1.5 hours)."""
    if minutes < 60:
        return f"{minutes} min"
    if minutes % 60 == 0:
        hrs = minutes // 60
        return f"{hrs} hour" if hrs == 1 else f"{hrs} hours"
    hrs = minutes / 60.0
    return f"{hrs:.1f} hours"


def _evaluate_single_offset(
    offset_h: float,
    base_dt: datetime,
    sample_points: List[Dict[str, Any]],
    total_distance_km: float,
    total_duration_min: float,
    hourly_batch: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Helper to evaluate risk at a specific float hour offset (e.g. 0.75h = 45 min)."""
    shifted_dt = base_dt + timedelta(minutes=int(offset_h * 60))

    shifted_points = estimate_eta(
        sample_points=sample_points,
        total_distance_km=total_distance_km,
        total_duration_min=total_duration_min,
        departure_time=shifted_dt,
    )

    points_with_weather = get_weather_for_route(
        shifted_points, forecast_days=3, hourly_batch=hourly_batch
    )
    points_with_risk = analyze_route_risk(points_with_weather)
    risk_summary = build_risk_summary(points_with_risk)

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

    return {
        "offset_hours": offset_h,
        "offset_minutes": int(offset_h * 60),
        "departure_time": shifted_dt.isoformat(),
        "overall_risk": overall_level,
        "max_risk_score": max_score,
        "hazards": unique_hazards,
        "risk_summary": risk_summary,
    }


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
    Compute route risk snapshots across future departure hours (e.g. +0h to +24h)
    and detect any nearby "Golden Window" departure opportunity.
    """
    if not sample_points:
        return {"timeline": [], "best_departure": None, "golden_window": None}

    base_dt = _parse_datetime(base_departure_time)

    # Fetch raw hourly weather once if not already provided
    if hourly_batch is None:
        hourly_batch = fetch_hourly_weather_batch(sample_points, forecast_days=3)

    timeline = []
    # Main hourly snapshots for slider timeline
    for offset_h in range(0, max_hours + 1, step_hours):
        snapshot = _evaluate_single_offset(
            float(offset_h), base_dt, sample_points, total_distance_km, total_duration_min, hourly_batch
        )
        timeline.append(snapshot)

    initial_entry = timeline[0] if timeline else None

    # Evaluate fine-grained sub-hour candidates for Golden Window detection (e.g. 15m, 30m, 45m, 1h, 1.5h, 2h, 3h, 4h)
    fine_offsets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0]
    candidate_snapshots = list(timeline)

    for sub_h in fine_offsets:
        if sub_h <= max_hours and not any(abs(c["offset_hours"] - sub_h) < 0.01 for c in candidate_snapshots):
            sub_snap = _evaluate_single_offset(
                sub_h, base_dt, sample_points, total_distance_km, total_duration_min, hourly_batch
            )
            candidate_snapshots.append(sub_snap)

    candidate_snapshots.sort(key=lambda c: c["offset_hours"])

    # Determine Golden Window
    golden_window = None
    if initial_entry:
        initial_level_rank = RISK_LEVEL_ORDER.get(initial_entry["overall_risk"], 0)
        initial_score = initial_entry["max_risk_score"]

        best_golden = None
        best_score_drop = 0

        for cand in candidate_snapshots:
            if cand["offset_hours"] <= 0:
                continue

            cand_level_rank = RISK_LEVEL_ORDER.get(cand["overall_risk"], 0)
            cand_score = cand["max_risk_score"]
            score_drop = initial_score - cand_score

            # Qualifies as Golden Window if risk level drops OR score drops by >= 15 pts
            level_improved = cand_level_rank < initial_level_rank
            score_improved = score_drop >= 15

            if level_improved or score_improved:
                if score_drop > best_score_drop:
                    best_score_drop = score_drop
                    best_golden = cand

        if best_golden:
            offset_mins = best_golden["offset_minutes"]
            time_desc = _format_time_offset_desc(offset_mins)
            dep_dt = datetime.fromisoformat(best_golden["departure_time"].replace("Z", "+00:00"))
            time_formatted = dep_dt.strftime("%I:%M %p").lstrip("0")

            headline = (
                f"Risk drops to {best_golden['overall_risk']} if you leave {time_desc} later."
            )
            recommendation_msg = (
                f"✨ Golden Window Detected: Risk drops from {initial_entry['overall_risk']} to "
                f"{best_golden['overall_risk']} if you leave {time_desc} later (at {time_formatted})."
            )

            golden_window = {
                "detected": True,
                "offset_hours": best_golden["offset_hours"],
                "offset_minutes": offset_mins,
                "departure_time": best_golden["departure_time"],
                "initial_risk": initial_entry["overall_risk"],
                "new_risk": best_golden["overall_risk"],
                "initial_score": initial_score,
                "new_score": best_golden["max_risk_score"],
                "score_reduction": max(0, initial_score - best_golden["max_risk_score"]),
                "headline": headline,
                "time_desc": time_desc,
                "formatted_time": time_formatted,
                "recommendation": recommendation_msg,
                "risk_summary": best_golden["risk_summary"],
            }

    # Determine best departure time window
    best_entry = min(timeline, key=lambda entry: (entry["max_risk_score"], entry["offset_hours"]))

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
        "golden_window": golden_window,
    }
