from datetime import datetime

import pytest

from app.services.eta import estimate_eta


def test_estimate_eta_adds_expected_arrival_times():
    sample_points = [
        {
            "index": 0,
            "latitude": 28.6139,
            "longitude": 77.2090,
            "distance_from_start": 0,
        },
        {
            "index": 1,
            "latitude": 29.3521,
            "longitude": 76.9814,
            "distance_from_start": 25,
        },
    ]

    departure_time = datetime(2026, 7, 10, 7, 0, 0)

    result = estimate_eta(sample_points, 100, 200, departure_time)

    assert result[0]["eta"] == departure_time
    assert result[1]["eta"] == datetime(2026, 7, 10, 7, 50, 0)


def test_estimate_eta_rejects_missing_required_values():
    with pytest.raises(ValueError, match="total_distance_km is required"):
        estimate_eta([], None, 200, datetime(2026, 7, 10, 7, 0, 0))
