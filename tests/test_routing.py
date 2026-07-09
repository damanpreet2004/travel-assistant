import pytest

from app.services import routing


class DummyResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


def test_get_route_handles_missing_features(monkeypatch):
    monkeypatch.setattr(routing, "ORS_API_KEY", "test-key")

    def fake_post(*args, **kwargs):
        return DummyResponse({
            "features": [],
            "error": {"message": "No route found"}
        })

    monkeypatch.setattr(routing.requests, "post", fake_post)

    with pytest.raises(RuntimeError, match="No route found"):
        routing.get_route(
            {"latitude": 51.5074, "longitude": -0.1278},
            {"latitude": 48.8566, "longitude": 2.3522},
        )


def test_get_route_parses_geojson_response(monkeypatch):
    monkeypatch.setattr(routing, "ORS_API_KEY", "test-key")

    def fake_post(*args, **kwargs):
        return DummyResponse({
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[0.0, 0.0], [1.0, 1.0]],
                    },
                    "properties": {
                        "summary": {
                            "distance": 120000.0,
                            "duration": 7200.0,
                        }
                    },
                }
            ]
        })

    monkeypatch.setattr(routing.requests, "post", fake_post)

    result = routing.get_route(
        {"latitude": 51.5074, "longitude": -0.1278},
        {"latitude": 48.8566, "longitude": 2.3522},
    )

    assert result["distance_km"] == 120.0
    assert result["duration_min"] == 120.0
    assert result["geometry"] == {
        "type": "LineString",
        "coordinates": [[0.0, 0.0], [1.0, 1.0]],
    }
