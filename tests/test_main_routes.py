from fastapi.testclient import TestClient

from app.main import app


def test_required_routes_are_registered():
    client = TestClient(app)
    routes = {route.path for route in app.routes}

    assert "/sample" in routes
    assert "/eta" in routes
    assert "/weather" in routes
    assert "/risk" in routes
