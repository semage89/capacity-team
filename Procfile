release: bash -c "if [ -f build.sh ]; then bash build.sh; elif [ -d frontend ]; then cd frontend && npm install && npm run build; else echo 'Frontend build skipped'; fi"
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120

