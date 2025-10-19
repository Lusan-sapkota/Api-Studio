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
from api.routes import requests, collections, environments, workspaces, auth, docs, notes, tasks, websocket_client, graphql_client, grpc_client, smtp_client, bootstrap, admin, user
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
        logger.info(f"Running in {settings.app_mode} mode")
        
        # Validate configuration based on mode
        validation_result = validate_and_log_config()
        app.state.config_validation = validation_result
        
        # Check for critical configuration errors in hosted mode
        if settings.app_mode == "hosted":
            if not validation_result.get("smtp_available", False):
                logger.warning("⚠️  SMTP not configured - email features will not work")
            
            if not settings.jwt_secret:
                logger.error("❌ JWT_SECRET is required in hosted mode")
                raise ConfigurationError("JWT_SECRET environment variable is required in hosted mode")
            
            if not settings.admin_bootstrap_token:
                logger.warning("⚠️  ADMIN_BOOTSTRAP_TOKEN not set - bootstrap will be disabled")
        
        # Initialize database and run migrations
        create_db_and_tables()
        
        # Run database migrations for authentication system
        from db.migrate import run_migration_safe
        migration_success = run_migration_safe()
        if not migration_success:
            logger.warning("⚠️  Database migration failed - some features may not work correctly")
        
        # Seed database
        for session in get_session():
            seed_database(session)
            break
        
        # Log startup completion with mode-specific info
        if settings.app_mode == "local":
            logger.info("✅ Application startup complete - Local mode (no authentication)")
        else:
            logger.info("✅ Application startup complete - Hosted mode (authentication enabled)")
            
            # Check if system needs bootstrap
            for session in get_session():
                from api.services.bootstrap_service import bootstrap_service
                if bootstrap_service.is_system_locked(session):
                    logger.info("🔒 System is locked - bootstrap required to create first admin user")
                else:
                    logger.info("🔓 System is unlocked - admin user exists")
                break
        
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

# CORS configuration for authentication
allowed_origins = [settings.frontend_url]
if settings.app_mode == "local":
    # In local mode, allow localhost variations for development
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "User-Agent",
        "X-Requested-With",
        "X-CSRF-Token"
    ],
    expose_headers=["X-Total-Count", "X-Page-Count"]
)

# Include routers
app.include_router(bootstrap.router)  # Bootstrap routes (must be first for system lock handling)
app.include_router(requests.router)
app.include_router(collections.router)
app.include_router(environments.router)
app.include_router(workspaces.router)
app.include_router(auth.router)
app.include_router(user.router)  # User profile and settings routes
app.include_router(admin.router)  # Admin routes for user management
app.include_router(docs.router)
app.include_router(notes.router)
app.include_router(tasks.router)
app.include_router(websocket_client.router)
app.include_router(graphql_client.router)
app.include_router(grpc_client.router)
app.include_router(smtp_client.router)


# Exception handlers
from datetime import datetime
from core.jwt_service import JWTError


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with consistent error format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": "HTTP_ERROR",
            "message": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(401)
async def authentication_error_handler(request, exc):
    """Handle authentication errors."""
    logger.warning(f"Authentication error: {exc.detail} - IP: {request.client.host}")
    return JSONResponse(
        status_code=401,
        content={
            "success": False,
            "error": "AUTHENTICATION_ERROR",
            "message": exc.detail,
            "details": "Please check your credentials and try again",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(403)
async def authorization_error_handler(request, exc):
    """Handle authorization errors."""
    logger.warning(f"Authorization error: {exc.detail} - User: {getattr(request.state, 'user', {}).get('email', 'unknown')}")
    return JSONResponse(
        status_code=403,
        content={
            "success": False,
            "error": "AUTHORIZATION_ERROR",
            "message": exc.detail,
            "details": "You don't have permission to access this resource",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(503)
async def service_unavailable_handler(request, exc):
    """Handle service unavailable errors (system locked)."""
    logger.info(f"System locked access attempt: {request.url.path}")
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "error": "SYSTEM_LOCKED",
            "message": exc.detail,
            "details": "Complete the bootstrap process to unlock the system",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(JWTError)
async def jwt_error_handler(request, exc):
    """Handle JWT-specific errors."""
    logger.warning(f"JWT error: {str(exc)} - IP: {request.client.host}")
    return JSONResponse(
        status_code=401,
        content={
            "success": False,
            "error": "TOKEN_ERROR",
            "message": "Invalid or expired token",
            "details": "Please log in again to get a new token",
            "timestamp": datetime.utcnow().isoformat()
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
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.get("/")
async def root():
    return {"message": "API Studio Backend"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint with configuration and database status."""
    config_validation = getattr(app.state, 'config_validation', {})
    
    # Check database health
    db_healthy = True
    db_error = None
    bootstrap_state = {}
    
    try:
        for session in get_session():
            from db.seed import check_bootstrap_state
            bootstrap_state = check_bootstrap_state(session)
            break
    except Exception as e:
        db_healthy = False
        db_error = str(e)
        logger.error(f"Database health check failed: {e}")
    
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "mode": settings.app_mode,
        "database": {
            "healthy": db_healthy,
            "error": db_error
        },
        "bootstrap": bootstrap_state,
        "smtp_available": config_validation.get("smtp_available", False),
        "warnings": config_validation.get("warnings", [])
    }


@app.get("/api/system-status")
async def system_status():
    """Detailed system status endpoint for admin monitoring."""
    try:
        status_info = {
            "mode": settings.app_mode,
            "version": "1.0.0",
            "database": {
                "type": "SQLite",
                "url": settings.database_url
            },
            "authentication": {
                "enabled": settings.app_mode == "hosted",
                "jwt_configured": bool(settings.jwt_secret),
                "bootstrap_available": bool(settings.admin_bootstrap_token) if settings.app_mode == "hosted" else False
            }
        }
        
        # Add database statistics
        for session in get_session():
            from db.seed import check_bootstrap_state
            bootstrap_info = check_bootstrap_state(session)
            status_info["bootstrap"] = bootstrap_info
            break
            
        return status_info
        
    except Exception as e:
        logger.error(f"System status check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve system status"
        )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        # TODO: Implement real-time updates logic
        await websocket.send_text(f"Echo: {data}")


# Authentication middleware and exception handlers implemented
# Rate limiting implemented in middleware for sensitive endpoints
# API versioning can be added in future iterations