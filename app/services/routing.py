import os
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

ORS_API_KEY = os.getenv("ORS_API_KEY")

BASE_URL = "https://api.openrouteservice.org/v2/directions/driving-car"


def get_route(origin, destination):
    """
    origin = {"latitude": ..., "longitude": ...}
    destination = {"latitude": ..., "longitude": ...}
    """
    if not ORS_API_KEY:
        raise ValueError("ORS_API_KEY is not configured")

    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json"
    }

    body = {
        "coordinates": [
            [
                origin["longitude"],
                origin["latitude"]
            ],
            [
                destination["longitude"],
                destination["latitude"]
            ]
        ]
    }

    response = requests.post(
        BASE_URL,
        headers=headers,
        json=body,
        timeout=15
    )

    response.raise_for_status()

    data = response.json()

    routes = data.get("routes", [])
    if not routes:
        error_message = data.get("error", {}).get("message", "No route found")
        raise RuntimeError(error_message)

    route = routes[0]
    summary = route["summary"]

    return {
        "distance_km": round(summary["distance"] / 1000, 2),
        "duration_min": round(summary["duration"] / 60, 2),
        "geometry": route["geometry"]
    }