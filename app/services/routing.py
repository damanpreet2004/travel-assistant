import os

import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

ORS_API_KEY = os.getenv("ORS_API_KEY")

BASE_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"


def get_route(origin, destination):
    """
    origin = {"latitude": ..., "longitude": ...}
    destination = {"latitude": ..., "longitude": ...}
    """
    if not ORS_API_KEY:
        return {
            "distance_km": None,
            "duration_min": None,
            "geometry": None,
            "warning": "Routing service is not configured",
        }

    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
    }

    body = {
        "coordinates": [
            [origin["longitude"], origin["latitude"]],
            [destination["longitude"], destination["latitude"]],
        ]
    }

    try:
        response = requests.post(
            BASE_URL,
            headers=headers,
            json=body,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        return {
            "distance_km": None,
            "duration_min": None,
            "geometry": None,
            "warning": "Routing service is currently unavailable",
        }

    features = data.get("features", [])
    if not features:
        error_message = data.get("error", {}).get("message", "No route found")
        return {
            "distance_km": None,
            "duration_min": None,
            "geometry": None,
            "warning": error_message,
        }

    feature = features[0]
    properties = feature.get("properties", {})
    summary = properties.get("summary", {})

    return {
        "distance_km": round(summary.get("distance", 0) / 1000, 2),
        "duration_min": round((summary.get("duration", 0) / 60) / 0.75, 2),
        "geometry": feature.get("geometry", {}),
    }