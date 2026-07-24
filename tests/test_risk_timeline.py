from datetime import datetime, timezone
from unittest.mock import patch
from app.services.risk_timeline import compute_risk_timeline


def test_compute_risk_timeline_empty():
    res = compute_risk_timeline([], 100, 60, datetime.now(timezone.utc))
    assert res["timeline"] == []
    assert res["best_departure"] is None


def test_compute_risk_timeline_basic():
    sample_points = [
        {
            "index": 0,
            "latitude": 28.6139,
            "longitude": 77.2090,
            "distance_from_start": 0,
            "eta": datetime(2026, 7, 24, 12, 0, tzinfo=timezone.utc).isoformat(),
        },
        {
            "index": 1,
            "latitude": 29.5000,
            "longitude": 77.5000,
            "distance_from_start": 100,
            "eta": datetime(2026, 7, 24, 13, 0, tzinfo=timezone.utc).isoformat(),
        },
    ]

    dummy_hourly_batch = [
        {
            "time": ["2026-07-24T12:00", "2026-07-24T13:00", "2026-07-24T14:00", "2026-07-24T15:00"],
            "temperature_2m": [25, 26, 27, 28],
            "precipitation": [0, 5.0, 0, 0],  # Rain at 13:00 for point 0
            "weather_code": [0, 63, 0, 0],
            "wind_speed_10m": [5, 10, 5, 5],
            "visibility": [10000, 10000, 10000, 10000],
        },
        {
            "time": ["2026-07-24T12:00", "2026-07-24T13:00", "2026-07-24T14:00", "2026-07-24T15:00"],
            "temperature_2m": [25, 26, 27, 28],
            "precipitation": [0, 0, 0, 0],
            "weather_code": [0, 0, 0, 0],
            "wind_speed_10m": [5, 5, 5, 5],
            "visibility": [10000, 10000, 10000, 10000],
        },
    ]

    base_time = datetime(2026, 7, 24, 12, 0, tzinfo=timezone.utc)
    res = compute_risk_timeline(
        sample_points=sample_points,
        total_distance_km=100,
        total_duration_min=60,
        base_departure_time=base_time,
        max_hours=3,
        step_hours=1,
        hourly_batch=dummy_hourly_batch,
    )

    assert len(res["timeline"]) == 4
    assert res["best_departure"] is not None
    assert "offset_hours" in res["best_departure"]
