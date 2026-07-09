"""
POST /chat – single entry point for the AI Travel Assistant.

The route validates the request and delegates all business logic to
the orchestrator.  No pipeline logic lives here.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from app.services.orchestrator import TripProcessingError, process_trip

router = APIRouter()


class ChatRequest(BaseModel):
    """Schema for the /chat endpoint request body."""

    message: str
    origin: str
    destination: str
    departure_time: datetime

    @field_validator("message", "origin", "destination")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Field must not be blank")
        return value.strip()


@router.post("/chat")
def chat(request: ChatRequest):
    """
    Execute the full trip-planning pipeline.

    Accepts a natural-language query alongside origin, destination, and
    departure time, then returns a structured response containing the route
    summary, per-waypoint risk analysis, and an AI-generated recommendation.
    """
    try:
        result = process_trip(
            user_query=request.message,
            origin=request.origin,
            destination=request.destination,
            departure_time=request.departure_time,
        )
    except TripProcessingError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": str(exc), "step": exc.step},
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result
