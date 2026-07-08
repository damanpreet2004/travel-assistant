from pydantic import BaseModel

class RouteResponse(BaseModel):
    distance_km: float
    duration_min: float
    geometry: str