release: cd frontend && npm install && npm run build || echo "Frontend build failed, continuing..."
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT

