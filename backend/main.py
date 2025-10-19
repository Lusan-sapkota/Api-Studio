from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from core.database import create_db_and_tables
from core.config import settings
from db.seed import seed_database
from core.database import get_session
from core.config_validator import validate_and_log_config, ConfigurationError
from core.middleware import AuthenticationMiddleware
from api.routes import requests, collections, environments, workspaces, auth, docs, notes, tasks, websocket_client, graphql_client, grpc_client, smtp_client, bootstrap, admin
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        logger.info("Starting API Studio Backend...")
        
        # Validate configuration
        validation_result = validate_and_log_config()
        app.state.config_validation = validation_result
        
        # Initialize database
        create_db_and_tables()
        
        # Seed database
        for session in get_session():
            seed_database(session)
            break
        
        logger.info("✅ Application startup complete")
        
    except ConfigurationError as e:
        logger.error(f"❌ Startup failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected startup error: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down API Studio Backend...")
    # Add cleanup logic here if needed


app = FastAPI(
    title="API Studio Backend",
    description="Backend for local-first API testing and documentation tool",
    version="1.0.0",
    lifespan=lifespan
)

# Authentication middleware (must be added before CORS)
app.add_middleware(AuthenticationMiddleware, app_mode=settings.app_mode)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(bootstrap.router)  # Bootstrap routes (must be first for system lock handling)
app.include_router(requests.router)
app.include_router(collections.router)
app.include_router(environments.router)
app.include_router(workspaces.router)
app.include_router(auth.router)
app.include_router(admin.router)  # Admin routes for user management
app.include_router(docs.router)
app.include_router(notes.router)
app.include_router(tasks.router)
app.include_router(websocket_client.router)
app.include_router(graphql_client.router)
app.include_router(grpc_client.router)
app.include_router(smtp_client.router)


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with consistent error format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": "HTTP_ERROR",
            "message": exc.detail,
            "timestamp": "2025-10-19T12:00:00Z"  # In production, use datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(500)
async def internal_server_error_handler(request, exc):
    """Handle internal server errors."""
    logger.error(f"Internal server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "INTERNAL_ERROR",
            "message": "Internal server error",
            "timestamp": "2025-10-19T12:00:00Z"
        }
    )


@app.get("/")
async def root():
    return {"message": "API Studio Backend"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint with configuration status."""
    config_validation = getattr(app.state, 'config_validation', {})
    
    return {
        "status": "healthy",
        "mode": settings.app_mode,
        "smtp_available": config_validation.get("smtp_available", False),
        "warnings": config_validation.get("warnings", [])
    }


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