#!/bin/bash

echo "🚀 Setting up API Studio..."

# Backend setup
echo "📦 Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip

# Try to install requirements, fall back to minimal if needed
if ! pip install -r requirements.txt; then
    echo "⚠️  Full requirements failed, trying minimal requirements for Python 3.13..."
    pip install -r requirements-minimal.txt
    echo "⚠️  Some features may be limited with minimal requirements"
fi

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
fi

cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Backend: cd backend && source .venv/bin/activate && python start.py"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Frontend will be available at: http://localhost:5173"
echo "🔧 Backend API will be available at: http://localhost:8000"
echo "📚 API Documentation will be available at: http://localhost:8000/docs"