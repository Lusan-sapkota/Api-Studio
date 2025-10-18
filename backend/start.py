#!/usr/bin/env python3
"""
Simple startup script for API Studio backend
"""
#!/usr/bin/env python3
"""
Simple startup script for API Studio backend
"""
import uvicorn
import os
from dotenv import load_dotenv
from core.config import settings

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get configuration from settings or environment
    host = os.getenv("HOST", settings.host)
    port = int(os.getenv("PORT", settings.port))
    reload = os.getenv("RELOAD", str(settings.reload)).lower() == "true"
    
    print(f"Starting API Studio Backend on {host}:{port}")
    print(f"Reload mode: {'enabled' if reload else 'disabled'}")
    print(f"Frontend URL: {settings.frontend_url}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )