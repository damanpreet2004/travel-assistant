from typing import Any, Dict, List, Optional
from app.services.geocoder import reverse_geocode

def build_route_summary(route_data: Dict[str, Any], origin: str, destination: str) -> Dict[str, Any]:
    """
    Build a compact summary of the route data.
    
    Args:
        route_data (Dict[str, Any]): Route data from the Routing module.
        origin (str): Origin name.
        destination (str): Destination name.
        
    Returns:
        Dict[str, Any]: Compact dictionary containing route summary.
    """
    return {
        "origin": origin,
        "destination": destination,
        "distance_km": route_data.get("distance_km"),
        "duration_min": route_data.get("duration_min")
    }


def build_risk_summary(route_points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Build a compact summary of risk data for each point in the route.
    
    Args:
        route_points (List[Dict[str, Any]]): Processed route points after Weather and Risk Analysis.
        
    Returns:
        List[Dict[str, Any]]: Simplified list of risk data.
    """
    summary = []
    
    for point in route_points:
        lat = point.get("latitude")
        lon = point.get("longitude")
        
        # Use nearest town/location if available, fallback to coordinates
        location = point.get("location_name") or point.get("location")
        if not location and lat is not None and lon is not None:
            rev_loc = reverse_geocode(lat, lon)
            if rev_loc:
                location = rev_loc
            else:
                location = f"{lat},{lon}"
        elif not location:
            location = "Unknown"
            
        eta = point.get("eta")
        
        weather_data = point.get("weather")
        if isinstance(weather_data, dict):
            weather_desc = weather_data.get("description", "Unknown")
            precipitation = weather_data.get("precipitation", 0) or 0
        else:
            weather_desc = "Unknown"
            precipitation = 0
            
        # Determine rain status from precipitation value or hazards
        rain = None
            
        risk_data = point.get("risk")
        if isinstance(risk_data, dict):
            risk_level = risk_data.get("level", "UNKNOWN")
            hazards = risk_data.get("hazards", [])
        else:
            risk_level = "UNKNOWN"
            hazards = []

        # Derive rain info from hazards list (set by risk analysis)
        if "Heavy Rain" in hazards:
            rain = "Heavy Rain"
        elif "Light Rain" in hazards or "Light Drizzle" in hazards:
            rain = "Light Rain"
        elif precipitation > 0:
            rain = f"{precipitation:.1f} mm"
        else:
            rain = "None"
            
        summary.append({
            "location": location,
            "latitude": lat,
            "longitude": lon,
            "eta": eta,
            "weather": weather_desc,
            "rain": rain,
            "risk": risk_level,
            "hazards": hazards,
        })
        
    return summary
