release: ./build.sh || echo "Build failed, but continuing..."
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120

