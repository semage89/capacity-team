release: echo "=== Release Phase: Building frontend ===" && cd frontend && npm install && npm run build && echo "=== Frontend build completed in release phase ===" && ls -la build/ || echo "=== Frontend build failed in release phase, continuing... ==="
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120

