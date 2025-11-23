#!/bin/bash

# Skrypt do uruchomienia Capacity Team Planner

echo "🚀 Uruchamianie Capacity Team Planner..."

# Sprawdź czy backend ma plik .env
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Plik backend/.env nie istnieje!"
    echo "📝 Utwórz plik .env w katalogu backend na podstawie config_example.py"
    echo "   Więcej informacji w SETUP.md"
    exit 1
fi

# Uruchom backend w tle
echo "🔧 Uruchamianie backendu..."
cd backend
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate 2>/dev/null || true
pip install -r requirements.txt > /dev/null 2>&1 || pip3 install -r requirements.txt
python app.py &
BACKEND_PID=$!
cd ..

# Poczekaj chwilę na uruchomienie backendu
sleep 3

# Sprawdź czy frontend ma node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instalowanie zależności frontendu..."
    cd frontend
    npm install
    cd ..
fi

# Uruchom frontend
echo "🎨 Uruchamianie frontendu..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Aplikacja uruchomiona!"
echo "📊 Backend: http://localhost:5000"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Aby zatrzymać aplikację, naciśnij Ctrl+C"

# Funkcja czyszczenia przy zakończeniu
cleanup() {
    echo ""
    echo "🛑 Zatrzymywanie aplikacji..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Czekaj na zakończenie
wait

