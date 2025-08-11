#!/bin/bash

# Railway startup script for Fantasy Football App (Full-Stack)
echo "🚀 Starting Fantasy Football App (Full-Stack) on Railway..."

# Check if we're in the right directory
if [ ! -f "app/api/main.py" ]; then
    echo "❌ Error: main.py not found. Make sure you're in the project root."
    exit 1
fi

# Check if Next.js build exists
if [ ! -d "app/web/out" ]; then
    echo "⚠️  Warning: Next.js build not found. API will work but frontend may not be available."
fi

# Start the unified service
echo "📡 Starting FastAPI backend with frontend..."
cd app/api
python main.py
