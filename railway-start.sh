#!/bin/bash

# Railway startup script for Fantasy Football App
echo "🚀 Starting Fantasy Football App on Railway..."

# Check if we're in the right directory
if [ ! -f "app/api/main.py" ]; then
    echo "❌ Error: main.py not found. Make sure you're in the project root."
    exit 1
fi

# Start the API service
echo "📡 Starting FastAPI backend..."
cd app/api
python main.py
