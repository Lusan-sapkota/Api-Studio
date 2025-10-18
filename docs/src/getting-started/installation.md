# Installation

This guide will help you install and set up API Studio on your local machine.

## Prerequisites

Before installing API Studio, make sure you have the following installed:

### Required Software

=== "Python"

    **Python 3.11 or higher** (Python 3.13 supported)
    
    ```bash
    # Check your Python version
    python --version
    # or
    python3 --version
    ```
    
    !!! tip "Python Version"
        While Python 3.13 is supported, we recommend Python 3.11 or 3.12 for the best compatibility with all dependencies.

=== "Node.js"

    **Node.js 18 or higher**
    
    ```bash
    # Check your Node.js version
    node --version
    npm --version
    ```
    
    Download from [nodejs.org](https://nodejs.org/) if not installed.

=== "Git"

    **Git** for cloning the repository
    
    ```bash
    # Check if Git is installed
    git --version
    ```
    
    Download from [git-scm.com](https://git-scm.com/) if not installed.

## Installation Methods

### Method 1: Automated Setup (Recommended)

The easiest way to get started is using our automated setup script:

```bash
# Clone the repository
git clone https://github.com/Lusan-sapkota/Api-Studio.git
cd api-studio

# Make the setup script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

The setup script will:

- Create Python virtual environment
- Install all Python dependencies
- Install Node.js dependencies
- Create configuration files
- Provide startup instructions

### Method 2: Manual Setup

If you prefer to set up manually or the automated script doesn't work:

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

#### Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

## Configuration

### Environment Variables

Edit the `.env` file in the backend directory to configure your setup:

```bash
# Database
DATABASE_URL=sqlite:///./api_studio.db

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend URL for CORS
FRONTEND_URL=http://localhost:56173

# Optional admin credentials for seeding
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=admin123
```

!!! warning "Security"
    Make sure to change the `SECRET_KEY` in production environments. You can generate a secure key using:
    ```bash
    python -c "import secrets; print(secrets.token_urlsafe(32))"
    ```

### Database Setup

API Studio uses SQLite by default, which requires no additional setup. The database file will be created automatically when you first run the application.

For production use, you can configure PostgreSQL (support coming soon).

## Verification

### Start the Backend

```bash
cd backend
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
python start.py
```

You should see output similar to:

```
🚀 Starting API Studio Backend on 0.0.0.0:58123
📝 Reload mode: enabled
🌐 Frontend URL: http://localhost:56173
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:58123 (Press CTRL+C to quit)
```

### Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

You should see output similar to:

```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:56173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Access the Application

Open your browser and navigate to:

- **Frontend**: [http://localhost:56173](http://localhost:56173)
- **Backend API**: [http://localhost:58123](http://localhost:58123)
- **API Documentation**: [http://localhost:58123/docs](http://localhost:58123/docs)

## Troubleshooting

### Common Issues

=== "Python Version Issues"

    If you encounter issues with Python 3.13:
    
    ```bash
    # Use Python 3.11 or 3.12 instead
    python3.11 -m venv .venv
    # or
    python3.12 -m venv .venv
    ```

=== "Package Installation Fails"

    If pip installation fails:
    
    ```bash
    # Try installing without building from source
    pip install --only-binary=all -r requirements.txt
    
    # Or use the minimal requirements
    pip install -r requirements-minimal.txt
    ```

=== "Port Already in Use"

    If ports 8000 or 5173 are already in use:
    
    ```bash
    # Backend - change port in start.py or use environment variable
    export PORT=8001
    python start.py
    
    # Frontend - Vite will automatically use the next available port
    npm run dev
    ```

=== "CORS Issues"

    If you encounter CORS errors:
    
    1. Make sure the backend is running
    2. Check that `FRONTEND_URL` in `.env` matches your frontend URL
    3. Restart the backend after changing the `.env` file

### Getting Help

If you encounter issues not covered here:

1. Check the [Troubleshooting Guide](../support/troubleshooting.md)
2. Search [GitHub Issues](https://github.com/Lusan-sapkota/Api-Studio/issues)
3. Create a new issue with detailed information
4. Contact support at [sapkotalusan@gmail.com](mailto:sapkotalusan@gmail.com)

## Next Steps

Once you have API Studio running:

1. [Quick Start Guide](quick-start.md) - Learn the basics
2. [API Clients Overview](../api-clients/overview.md) - Explore the different clients
3. [Configuration Guide](configuration.md) - Customize your setup