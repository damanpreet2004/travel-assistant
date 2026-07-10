import functools
import requests
from typing import Optional

BASE_URL = "https://nominatim.openstreetmap.org/search"
REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"

headers = {
    "User-Agent": "TravelAssistant/1.0" 
}

def geocode(Place : str):
    prams = {
        "q": Place,
        "format": "jsonv2",
        "limit": 1
    }
    response = requests.get(
        BASE_URL,
        params=prams,
        headers=headers
    )
    response.raise_for_status()
    data = response.json()
    if not data:
        return None
    
    result = data[0]
    return {
        "name": result.get("display_name"),
        "latitude": float(result.get("lat")),
        "longitude": float(result.get("lon"))
    }

@functools.lru_cache(maxsize=128)
def reverse_geocode(lat: float, lon: float) -> Optional[str]:
    params = {
        "lat": lat,
        "lon": lon,
        "format": "jsonv2"
    }
    try:
        response = requests.get(
            REVERSE_URL,
            params=params,
            headers=headers,
            timeout=5
        )
        response.raise_for_status()
        data = response.json()
        
        if "error" in data:
            return None
            
        address = data.get("address", {})
        
        for key in ["city", "town", "village", "hamlet", "county"]:
            if key in address:
                return address[key]
                
        if "name" in data and data["name"]:
            return data["name"]
            
        return None
    except Exception:
        return None