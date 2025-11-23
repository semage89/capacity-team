# Capacity Team Planner

Aplikacja do planowania pojemności zespołu zintegrowana z Jira i Tempo.

## Funkcjonalności

- 📊 Planowanie pojemności na podstawie projektów i użytkowników z Jira
- ⏱️ Śledzenie wykorzystania czasu per projekt (Tempo)
- 👥 Zarządzanie zasobami zespołu
- 📈 Wizualizacja capacity i wykorzystania czasu

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
   - `JIRA_API_TOKEN` - Token API (wygeneruj w: https://id.atlassian.com/manage-profile/security/api-tokens)
   - `TEMPO_API_TOKEN` - Token API Tempo (jeśli używane)

## Uruchomienie

### Szybki start (zalecane)

```bash
./start.sh
```

Skrypt automatycznie uruchomi backend i frontend.

### Ręczne uruchomienie

#### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend będzie dostępny na `http://localhost:5000`

#### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend będzie dostępny na `http://localhost:3000`

## Użycie

1. Zaloguj się używając danych Jira
2. Wybierz projekt z listy
3. Przeglądaj capacity i wykorzystanie czasu
4. Planuj zasoby dla przyszłych sprintów

