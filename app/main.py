from fastapi import FastAPI

from app.routes.geocode import router as geocode_router
from app.routes.route import router as route_router
from app.routes.chat import router as chat_router

app = FastAPI(title="AI Travel Assistant")

app.include_router(geocode_router)
app.include_router(route_router)
app.include_router(chat_router)