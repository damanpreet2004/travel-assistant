import unittest
from unittest.mock import patch

from app.routes.route import route


class RouteEndpointTests(unittest.TestCase):
    def test_route_endpoint_returns_fallback_payload_when_routing_service_fails(self):
        with patch("app.routes.route.geocode", side_effect=[
            {"latitude": 51.5074, "longitude": -0.1278},
            {"latitude": 48.8566, "longitude": 2.3522},
        ]), patch("app.routes.route.get_route", return_value={"warning": "Routing service unavailable"}):
            response = route("London", "Paris")

        self.assertIsInstance(response, dict)
        self.assertIn("warning", response)
        self.assertEqual(response["warning"], "Routing service unavailable")


if __name__ == "__main__":
    unittest.main()
