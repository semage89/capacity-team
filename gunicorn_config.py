# Konfiguracja Gunicorn dla Heroku
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"
workers = 2
timeout = 120
keepalive = 5
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
preload_app = True

