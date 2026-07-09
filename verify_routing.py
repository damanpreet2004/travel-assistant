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

routing.ORS_API_KEY = 'test-key'
routing.requests.post = lambda *args, **kwargs: DummyResponse({
    'features': [{
        'type': 'Feature',
        'geometry': {'type': 'LineString', 'coordinates': [[0.0, 0.0], [1.0, 1.0]]},
        'properties': {'summary': {'distance': 120000.0, 'duration': 7200.0}}
    }]
})
result = routing.get_route({'latitude': 51.5074, 'longitude': -0.1278}, {'latitude': 48.8566, 'longitude': 2.3522})
print(result)
