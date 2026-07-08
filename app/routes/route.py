from fastapi import APIRouter, HTTPException
import requests

from app.services.geocoder import geocode
from app.services.routing import get_route

router = APIRouter()


@router.get("/route")
def route(origin: str, destination: str):

    origin_location = geocode(origin)
    destination_location = geocode(destination)

    if origin_location is None:
        raise HTTPException(
            status_code=404,
            detail=f"{origin} not found"
        )

    if destination_location is None:
        raise HTTPException(
            status_code=404,
            detail=f"{destination} not found"
        )

    try:
        result = get_route(
            origin_location,
            destination_location
        )
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Routing service request failed: {exc}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result