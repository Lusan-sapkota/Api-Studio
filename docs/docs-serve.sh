#!/bin/bash

echo "📚 API Studio Documentation Server"
echo "=================================="

# Check if MkDocs is installed
if ! command -v mkdocs &> /dev/null; then
    echo "❌ MkDocs not found. Installing..."
    pip install -r requirements-docs.txt
fi

# Check if custom logo exists
if [ ! -f "assets/logo.png" ] && [ ! -f "assets/logo.png" ]; then
    echo "ℹ️  Using default logo. You can add your own logo.png or logo.png to docs/assets/"
fi

echo "🚀 Starting documentation server..."
echo "📖 Documentation will be available at: http://localhost:58124"
echo "🔄 Auto-reload is enabled - changes will be reflected automatically"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Serve the documentation
mkdocs serve --dev-addr=localhost:58124