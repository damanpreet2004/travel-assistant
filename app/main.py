from fastapi import FastAPI

from app.routes.geocode import router as geocode_router
from app.routes.route import router as route_router

app = FastAPI()

app.include_router(geocode_router)
app.include_router(route_router)