# Instrukcja konfiguracji

## Krok 1: Konfiguracja Jira API Token

1. Zaloguj się do swojego konta Atlassian: https://id.atlassian.com/manage-profile/security/api-tokens
2. Kliknij "Create API token"
3. Nadaj nazwę tokenowi (np. "Capacity Planner")
4. Skopiuj wygenerowany token

## Krok 2: Konfiguracja Tempo API Token (opcjonalne)

Jeśli używasz Tempo Time Tracking:

1. Zaloguj się do Jira jako administrator
2. Przejdź do Tempo Settings
3. Wygeneruj API token w sekcji API
4. Skopiuj token

## Krok 3: Konfiguracja backendu

1. Przejdź do katalogu `backend`:
```bash
cd backend
```

2. Utwórz plik `.env`:
```bash
cp config_example.py .env
```

3. Edytuj plik `.env` i wypełnij:
```
JIRA_URL=https://twoja-domena.atlassian.net
JIRA_EMAIL=twoj-email@example.com
JIRA_API_TOKEN=twój-token-z-kroku-1
TEMPO_API_TOKEN=twój-token-tempo-z-kroku-2
```

4. Zainstaluj zależności:
```bash
pip install -r requirements.txt
```

5. Uruchom backend:
```bash
python app.py
```

Backend będzie dostępny na `http://localhost:5000`

## Krok 4: Konfiguracja frontendu

1. W nowym terminalu przejdź do katalogu `frontend`:
```bash
cd frontend
```

2. Zainstaluj zależności:
```bash
npm install
```

3. Uruchom frontend:
```bash
npm start
```

Frontend będzie dostępny na `http://localhost:3000`

## Weryfikacja

1. Otwórz przeglądarkę i przejdź do `http://localhost:3000`
2. Sprawdź czy widzisz listę projektów z Jira
3. Kliknij na projekt, aby zobaczyć szczegóły wykorzystania czasu

## Rozwiązywanie problemów

### Błąd: "Jira nie jest skonfigurowane"
- Sprawdź czy plik `.env` istnieje w katalogu `backend`
- Sprawdź czy wszystkie zmienne są poprawnie wypełnione
- Upewnij się, że backend jest uruchomiony

### Błąd: "Nie można załadować projektów"
- Sprawdź czy token Jira jest poprawny
- Sprawdź czy URL Jira jest poprawny (bez końcowego slasha)
- Sprawdź czy masz dostęp do projektów w Jira

### Błąd: "Tempo nie jest skonfigurowane"
- Jeśli nie używasz Tempo, to jest normalne
- Jeśli używasz, sprawdź czy token Tempo jest poprawny

