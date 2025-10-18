#!/usr/bin/env python3
"""
Simple startup script for API Studio backend
"""
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get configuration from environment or use defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    
    print(f"🚀 Starting API Studio Backend on {host}:{port}")
    print(f"📝 Reload mode: {'enabled' if reload else 'disabled'}")
    print(f"🌐 Frontend URL: {os.getenv('FRONTEND_URL', 'http://localhost:5173')}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )