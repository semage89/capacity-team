release: echo "=== Release Phase: Checking frontend build ===" && if [ -d "frontend/build" ]; then echo "✓ Frontend build exists"; else echo "⚠ Frontend build not found (should have been built in heroku-postbuild)"; fi
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120

