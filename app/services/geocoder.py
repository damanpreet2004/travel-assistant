import functools
import requests
from typing import Optional, Dict, Any

# Komoot's public Photon API is hosted on its own subdomain, not komoot.io itself
BASE_URL = "https://photon.komoot.io/api/"
REVERSE_URL = "https://photon.komoot.io/reverse"

HEADERS = {
    "User-Agent": "TravelAssistant/1.0" 
}

def geocode(
    place: str, 
    bias_lat: Optional[float] = None, 
    bias_lon: Optional[float] = None
) -> Optional[Dict[str, Any]]:
    """
    Geocodes a free-form string using Komoot's fuzzy Photon API.
    Optionally accepts location tracking bias to prioritize nearby points.
    """
    if not place or not place.strip():
        return None

    params = {
        "q": place.strip(),
        "limit": 1
    }
    
    # Photon location bias parameters (lon, lat)
    if bias_lat is not None and bias_lon is not None:
        params["lat"] = bias_lat
        params["lon"] = bias_lon

    try:
        response = requests.get(
            BASE_URL,
            params=params,
            headers=HEADERS,
            timeout=5
        )
        response.raise_for_status()
        data = response.json()
        
        # Photon returns a GeoJSON FeatureCollection
        features = data.get("features", [])
        if not features:
            return None
        
        first_match = features[0]
        properties = first_match.get("properties", {})
        geometry = first_match.get("geometry", {})
        coordinates = geometry.get("coordinates", [0.0, 0.0]) # [lon, lat]
        
        # Build a coherent name string from individual address fragments
        name_parts = [
            properties.get("name"),
            properties.get("street"),
            properties.get("city"),
            properties.get("state"),
            properties.get("country")
        ]
        display_name = ", ".join([str(p) for p in name_parts if p])

        return {
            "name": display_name or "Unknown Location",
            "latitude": float(coordinates[1]),   # GeoJSON lists index 1 as Lat
            "longitude": float(coordinates[0]),  # GeoJSON lists index 0 as Lon
            "type": properties.get("type"),
            "osm_key": properties.get("osm_key")
        }
    except Exception:
        return None

@functools.lru_cache(maxsize=128)
def reverse_geocode(lat: float, lon: float) -> Optional[str]:
    """
    Converts coordinates back into a location text string using Photon reverse lookup.
    """
    params = {
        "lat": lat,
        "lon": lon,
        "limit": 1
    }
    try:
        response = requests.get(
            REVERSE_URL,
            params=params,
            headers=HEADERS,
            timeout=5
        )
        response.raise_for_status()
        data = response.json()
        
        features = data.get("features", [])
        if not features:
            return None
            
        properties = features[0].get("properties", {})
        
        # Look for town/city naming components inside property flags
        for key in ["city", "town", "district", "locality", "county", "country"]:
            if key in properties and properties[key]:
                return properties[key]
                
        if "name" in properties and properties["name"]:
            return properties["name"]
            
        return None
    except Exception:
        return None
