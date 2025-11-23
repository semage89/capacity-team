#!/bin/bash
# Skrypt do budowania frontendu na Heroku

set -e

echo "=== Build Script: Starting ==="
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

echo ""
echo "=== Checking for frontend directory ==="
if [ -d "frontend" ]; then
    echo "✓ Frontend directory found"
    cd frontend
    echo "Current directory: $(pwd)"
    echo "Frontend contents:"
    ls -la
    
    echo ""
    echo "=== Installing frontend dependencies ==="
    npm install
    
    echo ""
    echo "=== Building frontend ==="
    npm run build
    
    echo ""
    echo "=== Checking build output ==="
    if [ -d "build" ]; then
        echo "✓ Build directory created"
        ls -la build/
        echo "=== Build completed successfully ==="
    else
        echo "✗ Build directory not found"
        exit 1
    fi
else
    echo "✗ Frontend directory not found"
    echo "Available directories:"
    ls -la
    exit 1
fi

