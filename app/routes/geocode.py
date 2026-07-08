from fastapi import APIRouter, HTTPException
from app.services.geocoder import geocode

router = APIRouter()

@router.get("/geocode")

def get_corrdinates(place: str):
    location = geocode(place)
    if not location:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )
    return location

