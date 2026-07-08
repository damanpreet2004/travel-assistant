from datetime import datetime

from app.services.weather import get_weather_for_route


def test_get_weather_for_route_adds_weather_data(monkeypatch):
    sample_points = [
        {
            "index": 0,
            "latitude": 28.6139,
            "longitude": 77.2090,
            "distance_from_start": 0,
            "eta": datetime(2026, 7, 10, 7, 0, 0),
        }
    ]

    class DummyResponse:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    def fake_get(*args, **kwargs):
        return DummyResponse({
            "hourly": {
                "time": ["2026-07-10T07:00"],
                "temperature_2m": [28.4],
                "precipitation": [0.2],
                "weather_code": [1],
                "wind_speed_10m": [12.5],
                "visibility": [10000],
            }
        })

    monkeypatch.setattr("app.services.weather.requests.get", fake_get)

    result = get_weather_for_route(sample_points)

    assert result[0]["weather"]["description"] == "Mainly Clear"
    assert result[0]["weather"]["temperature"] == 28.4
