from datetime import datetime



import requests

WEATHER_CODE_MAP = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Light Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Light Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Thunderstorm with Hail",
}


def _normalize_eta(eta):
    """Convert an ETA to a UTC-like ISO string accepted by Open-Meteo."""
    if eta is None:
        return None
    if isinstance(eta, datetime):
        return eta.strftime("%Y-%m-%dT%H:%M")
    return str(eta)


def get_weather(latitude, longitude, eta):
    """Fetch the weather forecast for a single point at its ETA."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": [
            "temperature_2m",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "visibility",
            "rain",
            "showers"
        ],
        "forecast_days": 2,
        "timezone": "GMT",
    }

    response = requests.get(url, params=params, timeout=20)
    response.raise_for_status()
    data = response.json()

    hourly_times = data.get("hourly", {}).get("time", [])
    hourly_temperatures = data.get("hourly", {}).get("temperature_2m", [])
    hourly_precipitation = data.get("hourly", {}).get("precipitation", [])
    hourly_weather_codes = data.get("hourly", {}).get("weather_code", [])
    hourly_wind_speed = data.get("hourly", {}).get("wind_speed_10m", [])
    hourly_visibility = data.get("hourly", {}).get("visibility", [])
    hourly_rain = data.get("hourly", {}).get("rain", [])
    hourly_showers = data.get("hourly", {}).get("showers", [])

    if not hourly_times:
        return {
            "temperature": None,
            "precipitation": None,
            "wind_speed": None,
            "visibility": None,
            "weather_code": None,
            "rain": None,
            "showers": None,
            "description": "Unavailable",
        }

    target_time = _normalize_eta(eta)
    import datetime as dt_module

    if target_time is None:
        target_dt = dt_module.datetime.now(dt_module.timezone.utc).replace(tzinfo=None)
    else:
        try:
            target_dt = datetime.fromisoformat(target_time.replace("Z", "+00:00"))
            if target_dt.tzinfo is not None:
                target_dt = target_dt.astimezone(dt_module.timezone.utc).replace(tzinfo=None)
        except ValueError:
            target_dt = dt_module.datetime.now(dt_module.timezone.utc).replace(tzinfo=None)

    closest_index = 0
    closest_delta = None

    for index, hour in enumerate(hourly_times):
        try:
            hour_dt = datetime.fromisoformat(hour.replace("Z", "+00:00"))
            if hour_dt.tzinfo is not None:
                hour_dt = hour_dt.astimezone(dt_module.timezone.utc).replace(tzinfo=None)
        except ValueError:
            continue
        delta = abs((hour_dt - target_dt).total_seconds())
        if closest_delta is None or delta < closest_delta:
            closest_delta = delta
            closest_index = index

    weather_code = hourly_weather_codes[closest_index] if closest_index < len(hourly_weather_codes) else None
    description = WEATHER_CODE_MAP.get(weather_code, "Unknown")

    return {
        "temperature": hourly_temperatures[closest_index] if closest_index < len(hourly_temperatures) else None,
        "precipitation": hourly_precipitation[closest_index] if closest_index < len(hourly_precipitation) else None,
        "wind_speed": hourly_wind_speed[closest_index] if closest_index < len(hourly_wind_speed) else None,
        "visibility": hourly_visibility[closest_index] if closest_index < len(hourly_visibility) else None,
        "rain": hourly_rain[closest_index] if closest_index < len(hourly_rain) else None,
        "showers": hourly_showers[closest_index] if closest_index < len(hourly_showers) else None,
        "weather_code": weather_code,
        "description": description,
    }


def get_weather_for_route(sample_points):
    """Attach weather information to each sampled route point."""
    enriched_points = []
    for point in sample_points:
        weather = get_weather(point.get("latitude"), point.get("longitude"), point.get("eta"))
        enriched_point = dict(point)
        enriched_point["weather"] = weather
        enriched_points.append(enriched_point)
    return enriched_points
