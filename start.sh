#!/bin/bash

# Sleeper Draft Assistant Startup Script
# This script starts both the backend API and frontend web app

echo "🚀 Starting Sleeper Draft Assistant..."

# Check if Python and Node.js are installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if .env file exists in api directory
if [ ! -f "app/api/.env" ]; then
    echo "⚠️  No .env file found in app/api/"
    echo "📝 Creating .env from template..."
    cp app/api/env.example app/api/.env
    echo "🔑 Please edit app/api/.env and add your OpenAI API key if desired"
    echo "   You can leave it empty for deterministic-only recommendations"
    echo ""
    read -p "Press Enter to continue after editing .env (or Ctrl+C to exit)..."
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting FastAPI backend..."
cd app/api
python3 main.py &
BACKEND_PID=$!
cd ../..

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check the logs above for errors."
    exit 1
fi

echo "✅ Backend started successfully (PID: $BACKEND_PID)"

# Start frontend
echo "🌐 Starting Next.js frontend..."
cd app/web
npm run dev &
FRONTEND_PID=$!
cd ../..

# Wait a moment for frontend to start
sleep 5

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start. Check the logs above for errors."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Frontend started successfully (PID: $FRONTEND_PID)"
echo ""
echo "🎉 Sleeper Draft Assistant is now running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for both processes
wait

