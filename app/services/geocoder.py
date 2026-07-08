import requests
BASE_URL = "https://nominatim.openstreetmap.org/search"

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