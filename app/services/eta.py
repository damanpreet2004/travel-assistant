from datetime import datetime, timedelta


def estimate_eta(sample_points, total_distance_km, total_duration_min, departure_time):
    """Attach an ETA to each sampled route point.

    The function derives an average travel speed from the full route distance and
    duration, then uses that speed to estimate how long it takes to reach each
    sampled waypoint from the start. Each ETA is computed deterministically by
    adding the travel duration to the provided departure time.
    """
    if total_duration_min <= 0:
        raise ValueError("total_duration_min must be greater than 0")

    if total_distance_km < 0:
        raise ValueError("total_distance_km must be non-negative")

    if not isinstance(departure_time, datetime):
        raise TypeError("departure_time must be a datetime instance")

    average_speed_kmh = total_distance_km / (total_duration_min / 60)

    estimated_points = []
    for point in sample_points:
        distance_from_start = point.get("distance_from_start", 0)
        travel_minutes = (distance_from_start / average_speed_kmh) * 60
        eta = departure_time + timedelta(minutes=travel_minutes)

        enriched_point = dict(point)
        enriched_point["eta"] = eta
        estimated_points.append(enriched_point)

    return estimated_points
