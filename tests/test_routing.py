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
