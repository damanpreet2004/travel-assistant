from datetime import datetime

import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.services.eta import estimate_eta
from app.services.geocoder import geocode
from app.services.risk import analyze_route_risk
from app.services.routing import get_route
from app.services.sampler import sample_route
from app.services.weather import get_weather_for_route
from app.services.recommendation import generate_recommendation

router = APIRouter()


def _parse_departure_time(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="departure_time must be a valid ISO datetime string",
            ) from exc
    raise HTTPException(status_code=400, detail="departure_time must be a datetime or ISO string")


@router.get("/route")
def route(origin: str, destination: str):
    try:
        origin_location = geocode(origin)
        destination_location = geocode(destination)
    except requests.RequestException as exc:
        return JSONResponse(
            status_code=503,
            content={"detail": "Geocoding service unavailable", "service": "geocoding"},
        )

    if origin_location is None:
        raise HTTPException(status_code=404, detail=f"{origin} not found")

    if destination_location is None:
        raise HTTPException(status_code=404, detail=f"{destination} not found")

    try:
        result = get_route(origin_location, destination_location)
    except ValueError as exc:
        return JSONResponse(status_code=500, content={"detail": str(exc), "service": "routing"})
    except requests.RequestException as exc:
        return JSONResponse(
            status_code=503,
            content={"detail": "Routing service unavailable", "service": "routing"},
        )
    except RuntimeError as exc:
        return JSONResponse(
            status_code=503,
            content={"detail": "Routing service unavailable", "service": "routing"},
        )

    return result


@router.post("/sample")
def create_sample(payload: dict):
    if "route_geometry" in payload:
        route_geometry = payload["route_geometry"]
    elif "geometry" in payload:
        route_geometry = payload
    else:
        route_geometry = None
    interval_km = payload.get("interval_km", 25) if isinstance(payload, dict) else 25

    try:
        samples = sample_route(route_geometry, interval_km=interval_km)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"samples": samples}


@router.post("/eta")
def create_eta(payload: dict):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object")

    sample_points = payload.get("sample_points")
    if sample_points is None:
        sample_points = payload.get("samples")
    if sample_points is None:
        raise HTTPException(status_code=400, detail="sample_points or samples is required")

    total_distance_km = payload.get("total_distance_km")
    total_duration_min = payload.get("total_duration_min")
    departure_time = _parse_departure_time(payload.get("departure_time"))

    try:
        points = estimate_eta(
            sample_points,
            total_distance_km,
            total_duration_min,
            departure_time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TypeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"points": points}


@router.post("/weather")
def create_weather(payload: dict):
    if isinstance(payload, dict):
        sample_points = payload.get("sample_points")
        if sample_points is None:
            sample_points = payload.get("samples")
        if sample_points is None:
            sample_points = payload.get("points")
        if sample_points is None:
            raise HTTPException(status_code=400, detail="sample_points, samples, or points is required")
    else:
        sample_points = payload

    return {"points": get_weather_for_route(sample_points)}


@router.post("/risk")
def create_risk(payload: dict):
    route_weather = payload.get("route_weather") or payload.get("points") or payload
    if isinstance(route_weather, dict):
        points_list = route_weather.get("points")
    else:
        points_list = route_weather

    if points_list is None:
        raise HTTPException(
            status_code=400, 
            detail="Valid weather points list could not be found in the payload."
        )
        
    return {"points": analyze_route_risk(points_list)}


@router.post("/recommendation")
def create_recommendation(payload: dict):
    user_query = payload.get("user_query", "Give me travel recommendations.")
    route_summary = payload.get("route_summary", {})
    risk_summary = payload.get("risk_summary", {})
    
    return generate_recommendation(user_query, route_summary, risk_summary)