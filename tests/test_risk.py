from app.services.risk import analyze_risk, analyze_route_risk


def test_analyze_risk_assigns_expected_level_and_hazards():
    weather_point = {
        "index": 0,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "distance_from_start": 0,
        "eta": "2026-07-10T07:00:00",
        "weather": {
            "temperature": 25.0,
            "precipitation": 8.0,
            "wind_speed": 20.0,
            "visibility": 2000,
            "weather_code": 65,
            "description": "Heavy Rain",
        },
    }

    result = analyze_risk(weather_point)

    assert result["risk"]["score"] >= 70
    assert result["risk"]["level"] == "EXTREME"
    assert "Heavy Rain" in result["risk"]["hazards"]
    assert "Poor Visibility" in result["risk"]["hazards"]
    assert "Strong Wind" in result["risk"]["hazards"]


def test_analyze_route_risk_returns_list_of_risk_results():
    route_weather = [
        {
            "index": 0,
            "latitude": 28.6139,
            "longitude": 77.2090,
            "distance_from_start": 0,
            "eta": "2026-07-10T07:00:00",
            "weather": {
                "temperature": 20.0,
                "precipitation": 0.0,
                "wind_speed": 5.0,
                "visibility": 10000,
                "weather_code": 0,
                "description": "Clear",
            },
        }
    ]

    result = analyze_route_risk(route_weather)

    assert len(result) == 1
    assert result[0]["risk"]["level"] == "SAFE"
