RISK_THRESHOLDS = {
    "precipitation": 2.0,
    "wind_speed": 15.0,
    "visibility": 5000,
}

WEATHER_CODE_HAZARDS = {
    45: "Dense Fog",
    48: "Dense Fog",
    51: "Light Drizzle",
    53: "Light Drizzle",
    55: "Light Drizzle",
    61: "Light Rain",
    63: "Heavy Rain",
    65: "Heavy Rain",
    71: "Snow",
    73: "Snow",
    75: "Snow",
    80: "Light Rain",
    81: "Light Rain",
    82: "Heavy Rain",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
}


def _score_precipitation(precipitation):
    if precipitation >= 10:
        return 35
    if precipitation >= 5:
        return 25
    if precipitation >= 2:
        return 15
    if precipitation > 0:
        return 5
    return 0


def _score_wind(wind_speed):
    if wind_speed >= 25:
        return 25
    if wind_speed >= 15:
        return 15
    if wind_speed >= 10:
        return 8
    if wind_speed >= 5:
        return 3
    return 0


def _score_visibility(visibility):
    if visibility <= 1000:
        return 30
    if visibility <= 3000:
        return 20
    if visibility <= 5000:
        return 10
    return 0


def _score_weather_code(weather_code):
    if weather_code in {65, 63, 82}:
        return 20
    if weather_code in {61, 80, 81}:  # Light Rain
        return 10
    if weather_code in {45, 48}:
        return 20
    if weather_code in {71, 73, 75}:
        return 20
    if weather_code in {95, 96, 99}:
        return 25
    return 0


def _classify_level(score):
    if score >= 80:
        return "EXTREME"
    if score >= 60:
        return "HIGH"
    if score >= 35:
        return "MODERATE"
    if score >= 15:
        return "LOW"
    return "SAFE"


def _color_for_level(level):
    return {
        "SAFE": "green",
        "LOW": "yellow",
        "MODERATE": "orange",
        "HIGH": "red",
        "EXTREME": "darkred",
    }[level]


def _build_reason(hazards, score):
    if not hazards:
        return "Weather conditions are favorable for travel."
    if score >= 80:
        return "Severe weather conditions substantially increase travel risk."
    if score >= 60:
        return "Adverse weather conditions significantly raise travel risk."
    return "Weather conditions present moderate travel concerns."


def _collect_hazards(weather):
    hazards = []
    precipitation = weather.get("precipitation", 0) or 0
    wind_speed = weather.get("wind_speed", 0) or 0
    visibility = weather.get("visibility")
    weather_code = weather.get("weather_code")
    description = weather.get("description", "") or ""

    if precipitation >= RISK_THRESHOLDS["precipitation"]:
        hazards.append("Heavy Rain")
    elif 0 < precipitation < RISK_THRESHOLDS["precipitation"]:
        hazards.append("Light Rain")
    if wind_speed >= RISK_THRESHOLDS["wind_speed"]:
        hazards.append("Strong Wind")
    if visibility is not None and visibility <= RISK_THRESHOLDS["visibility"]:
        hazards.append("Poor Visibility")

    code_hazard = WEATHER_CODE_HAZARDS.get(weather_code)
    if code_hazard and code_hazard not in hazards:
        hazards.append(code_hazard)

    desc_lower = description.lower()
    if "fog" in desc_lower and "Dense Fog" not in hazards:
        hazards.append("Dense Fog")
    if "snow" in desc_lower and "Snow" not in hazards:
        hazards.append("Snow")
    if "thunder" in desc_lower and "Thunderstorm" not in hazards:
        hazards.append("Thunderstorm")
    if "light rain" in desc_lower and "Light Rain" not in hazards:
        hazards.append("Light Rain")
    if ("heavy rain" in desc_lower or "rain" in desc_lower) and "Light Rain" not in hazards and "Heavy Rain" not in hazards:
        hazards.append("Heavy Rain")

    return hazards


def analyze_risk(weather_point):
    """Analyze a single weather point and attach a deterministic risk assessment."""
    weather = weather_point.get("weather", {})
    score = 0
    score += _score_precipitation(weather.get("precipitation", 0) or 0)
    score += _score_wind(weather.get("wind_speed", 0) or 0)
    score += _score_visibility(weather.get("visibility") or 0)
    score += _score_weather_code(weather.get("weather_code"))

    hazards = _collect_hazards(weather)
    level = _classify_level(score)

    enriched_point = dict(weather_point)
    enriched_point["risk"] = {
        "score": min(score, 100),
        "level": level,
        "color": _color_for_level(level),
        "hazards": hazards,
        "reason": _build_reason(hazards, score),
    }
    return enriched_point


def analyze_route_risk(route_weather):
    """Analyze a collection of weather points and return the risk summary for each."""
    return [analyze_risk(point) for point in route_weather]
