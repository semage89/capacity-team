#!/bin/bash
# Ten plik jest wykonywany przy starcie dyno na Heroku
# Upewniamy się, że frontend jest zbudowany
if [ ! -d "frontend/build" ]; then
  echo "Frontend build nie istnieje, budowanie..."
  cd frontend && npm install && npm run build && cd ..
fi

