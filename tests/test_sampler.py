from app.services.sampler import sample_route


def test_sample_route_includes_start_end_and_interval_points():
    route_geometry = [
        [0.0, 0.0],
        [0.225, 0.0],
        [0.45, 0.0],
    ]

    samples = sample_route(route_geometry, interval_km=25)

    assert samples[0]["latitude"] == 0.0
    assert samples[0]["longitude"] == 0.0
    assert samples[0]["distance_from_start"] == 0

    assert samples[-1]["latitude"] == 0.0
    assert samples[-1]["longitude"] == 0.45

    assert any(24 <= sample["distance_from_start"] <= 26 for sample in samples)
    assert len(samples) >= 3
