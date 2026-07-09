import unittest
from unittest.mock import patch

from app.services import recommendation


class RecommendationServiceTests(unittest.TestCase):
    def test_generate_recommendation_returns_structured_payload(self):
        with patch.object(recommendation, "_call_gemini_model", return_value="Drive cautiously and delay if storms intensify."):
            result = recommendation.generate_recommendation(
                user_query="Need a safe route to the coast",
                route_summary={
                    "distance_km": 120.5,
                    "duration_min": 95,
                    "segments": [
                        {"name": "City to highway", "eta": "2026-07-09T08:00:00"},
                        {"name": "Highway to coast", "eta": "2026-07-09T09:35:00"},
                    ],
                },
                risk_summary={
                    "risk_level": "HIGH",
                    "hazards": ["Heavy Rain", "Poor Visibility"],
                    "weather_description": "Thunderstorms expected near the coast",
                },
            )

        self.assertEqual(result["model"], "gemini-2.5-flash")
        self.assertIn("recommendation", result)
        self.assertTrue(result["generated_at"])
        self.assertEqual(result["recommendation"], "Drive cautiously and delay if storms intensify.")

    def test_prompt_includes_route_and_risk_details(self):
        prompt = recommendation.build_recommendation_prompt(
            user_query="Avoid bad weather",
            route_summary={
                "distance_km": 90,
                "duration_min": 70,
                "segments": [{"name": "Start", "eta": "2026-07-09T07:00:00"}],
            },
            risk_summary={
                "risk_level": "MODERATE",
                "hazards": ["Strong Wind"],
                "weather_description": "Cloudy",
            },
        )

        self.assertIn("Avoid bad weather", prompt)
        self.assertIn("90.0 km", prompt)
        self.assertIn("70 min", prompt)
        self.assertIn("Strong Wind", prompt)
        self.assertIn("Cloudy", prompt)


if __name__ == "__main__":
    unittest.main()
