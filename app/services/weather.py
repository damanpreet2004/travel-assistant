import datetime as dt_module
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

HOURLY_VARS = [
    "temperature_2m",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "visibility",
    "rain",
    "showers",
]

_EMPTY_WEATHER = {
    "temperature": None,
    "precipitation": None,
    "wind_speed": None,
    "visibility": None,
    "weather_code": None,
    "rain": None,
    "showers": None,
    "description": "Unavailable",
}

# Reuse one TCP/TLS connection across calls instead of opening a fresh one
# for every request.
_session = requests.Session()


def _normalize_eta(eta):
    """Convert an ETA to a UTC-like ISO string accepted by Open-Meteo."""
    if eta is None:
        return None
    if isinstance(eta, datetime):
        return eta.strftime("%Y-%m-%dT%H:%M")
    return str(eta)


def _to_utc_naive(target_time):
    """Parse an ISO-ish timestamp string into a naive UTC datetime.
    Falls back to 'now' if parsing fails or nothing was given."""
    if target_time is None:
        return dt_module.datetime.now(dt_module.timezone.utc).replace(tzinfo=None)
    try:
        target_dt = datetime.fromisoformat(target_time.replace("Z", "+00:00"))
        if target_dt.tzinfo is not None:
            target_dt = target_dt.astimezone(dt_module.timezone.utc).replace(tzinfo=None)
        return target_dt
    except ValueError:
        return dt_module.datetime.now(dt_module.timezone.utc).replace(tzinfo=None)


def _closest_hour_index(hourly_times, target_dt):
    """Find the index of the hourly timestamp closest to target_dt."""
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
    return closest_index


def _extract_at_index(hourly, index):
    """Pull out the single hour's values from one location's hourly block."""
    times = hourly.get("time", [])
    if not times:
        return dict(_EMPTY_WEATHER)

    def at(key):
        arr = hourly.get(key, [])
        return arr[index] if index < len(arr) else None

    weather_code = at("weather_code")
    return {
        "temperature": at("temperature_2m"),
        "precipitation": at("precipitation"),
        "wind_speed": at("wind_speed_10m"),
        "visibility": at("visibility"),
        "rain": at("rain"),
        "showers": at("showers"),
        "weather_code": weather_code,
        "description": WEATHER_CODE_MAP.get(weather_code, "Unknown"),
    }


def fetch_hourly_weather_batch(sample_points, forecast_days=3):
    """
    Fetch raw hourly forecast blocks for each sample point coordinate in a single batch request.
    Returns a list of hourly dicts corresponding 1-to-1 with sample_points.
    """
    if not sample_points:
        return []

    lats = [str(p.get("latitude")) for p in sample_points]
    lons = [str(p.get("longitude")) for p in sample_points]

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": ",".join(lats),
        "longitude": ",".join(lons),
        "hourly": ",".join(HOURLY_VARS),
        "forecast_days": forecast_days,
        "timezone": "GMT",
    }

    try:
        response = _session.get(url, params=params, timeout=20)
        response.raise_for_status()
        data = response.json()
    except Exception:
        return [{} for _ in sample_points]

    results = data if isinstance(data, list) else [data]
    return [(loc or {}).get("hourly", {}) for loc in results]


def get_weather_for_route(sample_points, forecast_days=3, hourly_batch=None):
    """
    Attach weather information to each sampled route point using batched Open-Meteo forecast data.
    If hourly_batch is provided, reuses existing forecast data without making an HTTP request.
    """
    if not sample_points:
        return []

    if hourly_batch is None:
        hourly_batch = fetch_hourly_weather_batch(sample_points, forecast_days=forecast_days)

    enriched_points = []
    for point, hourly in zip(sample_points, hourly_batch):
        target_dt = _to_utc_naive(_normalize_eta(point.get("eta")))
        hourly_times = hourly.get("time", [])

        if not hourly_times:
            weather = dict(_EMPTY_WEATHER)
        else:
            idx = _closest_hour_index(hourly_times, target_dt)
            weather = _extract_at_index(hourly, idx)

        enriched_point = dict(point)
        enriched_point["weather"] = weather
        enriched_points.append(enriched_point)

    return enriched_points


def get_weather(latitude, longitude, eta):
    """
    Single-point convenience wrapper, kept for callers that only need one
    location. Internally just calls the batched function with a list of one.
    """
    result = get_weather_for_route([{"latitude": latitude, "longitude": longitude, "eta": eta}])
    return result[0]["weather"] if result else dict(_EMPTY_WEATHER)