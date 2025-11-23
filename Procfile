release: echo "=== Release Phase: Building frontend ===" && pwd && ls -la && if [ -d "frontend" ]; then cd frontend && npm install && npm run build && echo "=== Frontend build completed ===" && ls -la build/; else echo "=== Frontend directory not found, skipping build ==="; fi
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120

