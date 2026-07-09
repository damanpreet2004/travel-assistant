"""
POST /chat – single natural-language entry point for the AI Travel Assistant.

Flow:
  1. Validate that `message` is present and non-blank.
  2. Call extract_trip_details() to parse origin / destination / departure_time.
  3. Validate the extracted fields and surface clear errors if any are missing.
  4. Call process_trip() to run the full pipeline.
  5. Return the consolidated response.

No business logic lives here — only request validation and error mapping.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from app.services.extract_trip_details import ExtractionError, extract_trip_details
from app.services.orchestrator import TripProcessingError, process_trip

router = APIRouter()


class ChatRequest(BaseModel):
    """Schema for the /chat endpoint — only a natural-language message is required."""

    message: str

    @field_validator("message")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message must not be blank")
        return value.strip()


@router.post("/chat")
def chat(request: ChatRequest):
    """
    Accept a natural-language travel query and return a full trip recommendation.

    Example request body:
        {"message": "I'm driving from Delhi to Manali tomorrow at 7 AM. Will I encounter bad weather?"}
    """

    # ------------------------------------------------------------------ #
    # Step 1 – Extract structured trip details from the user's message    #
    # ------------------------------------------------------------------ #
    try:
        trip = extract_trip_details(request.message)
    except ExtractionError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": str(exc), "step": "extract_trip_details"},
        ) from exc

    origin = trip.get("origin")
    destination = trip.get("destination")
    departure_time = trip.get("departure_time")

    # ------------------------------------------------------------------ #
    # Step 2 – Validate that all required fields were successfully parsed  #
    # ------------------------------------------------------------------ #
    missing = []
    if not origin:
        missing.append("origin")
    if not destination:
        missing.append("destination")
    if departure_time is None:
        missing.append("departure_time")

    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "error": (
                    f"Could not determine {', '.join(missing)} from your message. "
                    "Please be more specific."
                ),
                "step": "extract_trip_details",
            },
        )

    # ------------------------------------------------------------------ #
    # Step 3 – Run the full orchestration pipeline                        #
    # ------------------------------------------------------------------ #
    try:
        result = process_trip(
            user_query=request.message,
            origin=origin,
            destination=destination,
            departure_time=departure_time,
        )
    except TripProcessingError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error": str(exc), "step": exc.step},
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result
