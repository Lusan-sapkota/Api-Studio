from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.database import create_db_and_tables
from core.config import settings
from db.seed import seed_database
from core.database import get_session
from api.routes import requests, collections, environments, workspaces, auth, docs

# WebSocket endpoint
from fastapi import WebSocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    # Seed database
    for session in get_session():
        seed_database(session)
        break
    yield
    # Shutdown
    # Add cleanup logic here if needed


app = FastAPI(
    title="API Studio Backend",
    description="Backend for local-first API testing and documentation tool",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(requests.router)
app.include_router(collections.router)
app.include_router(environments.router)
app.include_router(workspaces.router)
app.include_router(auth.router)
app.include_router(docs.router)


@app.get("/")
async def root():
    return {"message": "API Studio Backend"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        # TODO: Implement real-time updates logic
        await websocket.send_text(f"Echo: {data}")


# TODO: Add authentication middleware
# TODO: Add exception handlers
# TODO: Add rate limiting
# TODO: Add API versioning