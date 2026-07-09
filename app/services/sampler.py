from math import asin, cos, radians, sin, sqrt


def _haversine_km(point_a, point_b):
    """Calculate the great-circle distance between two GPS points in kilometers."""
    lon1, lat1 = point_a
    lon2, lat2 = point_b

    radius_km = 6371.0
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)

    a = (
        sin(delta_phi / 2) ** 2
        + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
    )
    c = 2 * asin(sqrt(a))
    return radius_km * c


import json

def _extract_coordinates(route_geometry):
    """Normalize route geometry into a list of [longitude, latitude] coordinate pairs."""
    if not route_geometry:
        return []

    if isinstance(route_geometry, str):
        try:
            route_geometry = json.loads(route_geometry)
        except json.JSONDecodeError:
            return []

    if isinstance(route_geometry, dict):
        if route_geometry.get("type") == "LineString":
            return [tuple(coord) for coord in route_geometry.get("coordinates", [])]
        if route_geometry.get("type") == "Feature":
            geometry = route_geometry.get("geometry", {})
            return _extract_coordinates(geometry)
        if route_geometry.get("type") == "FeatureCollection":
            features = route_geometry.get("features", [])
            if features:
                return _extract_coordinates(features[0])
        if "geometry" in route_geometry:
            return _extract_coordinates(route_geometry["geometry"])
        return []

    if isinstance(route_geometry, list):
        if route_geometry and isinstance(route_geometry[0], (list, tuple)):
            if route_geometry and len(route_geometry[0]) == 2:
                return [tuple(coord) for coord in route_geometry]

    return []


def sample_route(route_geometry, interval_km=25):
    """Reduce a route geometry into evenly spaced sampled waypoints.

    The sampler walks the route in order, accumulates the traveled distance in
    kilometers, and stores a sample whenever the cumulative distance reaches or
    exceeds the configured interval. The start and end coordinates are always
    included.
    """
    coordinates = _extract_coordinates(route_geometry)
    if len(coordinates) < 2:
        return []

    if interval_km <= 0:
        raise ValueError("interval_km must be greater than 0")

    samples = []
    cumulative_distance = 0.0
    next_threshold = interval_km

    for index, point in enumerate(coordinates):
        if index == 0:
            samples.append({
                "index": len(samples),
                "latitude": point[1],
                "longitude": point[0],
                "distance_from_start": 0,
            })
            continue

        previous_point = coordinates[index - 1]
        segment_distance = _haversine_km(previous_point, point)
        cumulative_distance += segment_distance

        if cumulative_distance >= next_threshold:
            while cumulative_distance >= next_threshold:
                next_threshold += interval_km

            samples.append({
                "index": len(samples),
                "latitude": point[1],
                "longitude": point[0],
                "distance_from_start": round(cumulative_distance, 2),
            })

    if not samples or samples[-1]["latitude"] != coordinates[-1][1] or samples[-1]["longitude"] != coordinates[-1][0]:
        samples.append({
            "index": len(samples),
            "latitude": coordinates[-1][1],
            "longitude": coordinates[-1][0],
            "distance_from_start": round(cumulative_distance, 2),
        })

    return samples
