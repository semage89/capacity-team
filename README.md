# Capacity Team Planner

Aplikacja do planowania pojemności zespołu zintegrowana z Jira i Tempo.

## Funkcjonalności

- 📊 **Planowanie pojemności** - Przypisywanie FTE (Full-Time Equivalent) użytkowników do projektów per dzień
- ⏱️ **Śledzenie czasu** - Integracja z Tempo Time Tracking
- ✅ **Weryfikacja czasu** - Porównanie czasu spędzonego vs capacity (FTE) w danym okresie
- 📈 **Dashboard** - Wizualizacja capacity i wykorzystania czasu
- 👥 **Zarządzanie zasobami** - Przegląd projektów i użytkowników z Jira

## Nowe funkcjonalności

### 1. Zarządzanie FTE
- Przypisywanie ilości FTE użytkownika do projektu per dzień
- Wartość FTE: 0.0 - 1.0 (np. 0.5 = 50% czasu)
- Bulk operations - masowe przypisania
- Filtrowanie i przeglądanie przypisań

### 2. Weryfikacja czasu
- Porównanie czasu spędzonego w projekcie vs capacity (FTE)
- Wykresy dzienne pokazujące wykorzystanie
- Statystyki wykorzystania per użytkownik
- Kolorowe wskaźniki (zielony < 80%, żółty 80-100%, czerwony > 100%)

## Wymagania

- Python 3.9+
- Node.js 16+
- Konto Jira z dostępem do API
- Tempo Time Tracking (opcjonalnie)

## Instalacja

### Backend

```bash
cd backend
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Konfiguracja

1. Skopiuj `.env.example` do `.env` w katalogu `backend`
2. Wypełnij dane dostępowe do Jira:
   - `JIRA_URL` - URL Twojej instancji Jira
   - `JIRA_EMAIL` - Twój email w Jira
   - `JIRA_API_TOKEN` - Token API
   - `TEMPO_API_TOKEN` - Token API Tempo (opcjonalnie)

## Uruchomienie

### Lokalnie

```bash
# Backend
cd backend
python app.py

# Frontend (w nowym terminalu)
cd frontend
npm start
```

### Na Heroku

Aplikacja automatycznie używa PostgreSQL na Heroku. Baza danych jest tworzona automatycznie przy pierwszym uruchomieniu.

## API Endpoints

### FTE Management
- `GET /api/fte` - Pobierz przypisania FTE (z filtrami)
- `POST /api/fte` - Utwórz nowe przypisanie FTE
- `PUT /api/fte/<id>` - Aktualizuj przypisanie FTE
- `DELETE /api/fte/<id>` - Usuń przypisanie FTE
- `POST /api/fte/bulk` - Masowe przypisania FTE

### Time Verification
- `GET /api/verification/time` - Weryfikacja czasu vs capacity

### Existing Endpoints
- `GET /api/projects` - Lista projektów
- `GET /api/users` - Lista użytkowników
- `GET /api/capacity` - Capacity wszystkich projektów
- `GET /api/time/project/<key>` - Czas per projekt

## Użycie

1. **Zarządzanie FTE**: 
   - Wybierz projekt, użytkownika, datę i wartość FTE
   - Zapisz przypisanie
   - Przeglądaj i zarządzaj istniejącymi przypisaniami

2. **Weryfikacja czasu**:
   - Wybierz projekt i/lub użytkownika
   - Określ zakres dat
   - Zobacz porównanie czasu spędzonego vs capacity
   - Analizuj wykresy i statystyki wykorzystania

3. **Dashboard**:
   - Przeglądaj ogólne statystyki capacity
   - Analizuj wykorzystanie czasu per projekt

