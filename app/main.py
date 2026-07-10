from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.geocode import router as geocode_router
from app.routes.route import router as route_router
from app.routes.chat import router as chat_router

app = FastAPI(title="AI Travel Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(geocode_router)
app.include_router(route_router)
app.include_router(chat_router)