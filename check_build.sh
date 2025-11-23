#!/bin/bash
# Skrypt do sprawdzenia czy frontend został zbudowany

echo "Sprawdzanie builda frontendu..."
echo "Katalog roboczy: $(pwd)"
echo ""

if [ -d "frontend/build" ]; then
    echo "✓ Folder frontend/build istnieje"
    echo "Zawartość:"
    ls -la frontend/build/ | head -20
    echo ""
    if [ -f "frontend/build/index.html" ]; then
        echo "✓ Plik index.html istnieje"
    else
        echo "✗ Plik index.html NIE istnieje"
    fi
else
    echo "✗ Folder frontend/build NIE istnieje"
    echo ""
    echo "Sprawdzam strukturę katalogów:"
    ls -la | grep frontend
    if [ -d "frontend" ]; then
        echo ""
        echo "Zawartość frontend/:"
        ls -la frontend/
    fi
fi

