# Wdrożenie na Heroku

## Krok 1: Konfiguracja buildpacków

Heroku potrzebuje dwóch buildpacków (Node.js i Python). Ustaw je w odpowiedniej kolejności:

```bash
heroku buildpacks:add --index 1 heroku/nodejs
heroku buildpacks:add --index 2 heroku/python
```

Lub przez dashboard Heroku:
1. Przejdź do Settings w swojej aplikacji
2. W sekcji "Buildpacks" dodaj:
   - `heroku/nodejs` (pierwszy)
   - `heroku/python` (drugi)

## Krok 2: Konfiguracja zmiennych środowiskowych

Ustaw zmienne środowiskowe w Heroku:

```bash
heroku config:set JIRA_URL=https://your-domain.atlassian.net
heroku config:set JIRA_EMAIL=your-email@example.com
heroku config:set JIRA_API_TOKEN=your-jira-api-token
heroku config:set TEMPO_API_TOKEN=your-tempo-api-token
```

Lub przez dashboard:
1. Przejdź do Settings
2. W sekcji "Config Vars" dodaj wszystkie zmienne

## Krok 3: Deploy

```bash
git add .
git commit -m "Configure for Heroku deployment"
git push heroku main
```

## Krok 4: Sprawdzenie logów

```bash
heroku logs --tail
```

## Rozwiązywanie problemów

### Błąd: "No default language could be detected"
- Upewnij się, że masz `package.json` w root katalogu
- Upewnij się, że masz `Procfile`
- Sprawdź czy buildpacki są ustawione: `heroku buildpacks`

### Błąd podczas budowania frontendu
- Sprawdź logi: `heroku logs --tail`
- Upewnij się, że Node.js buildpack jest pierwszy

### Błąd: "Module not found" w Pythonie
- Sprawdź czy `requirements.txt` jest w katalogu `backend/`
- Upewnij się, że Python buildpack jest ustawiony

### Frontend nie działa
- Sprawdź czy frontend został zbudowany: `heroku run ls frontend/build`
- Sprawdź logi builda: `heroku logs --tail` (szukaj "heroku-postbuild")
- Sprawdź czy buildpack Node.js jest pierwszy: `heroku buildpacks`
- Upewnij się, że `heroku-postbuild` w package.json jest poprawny
- Sprawdź logi aplikacji: `heroku logs --tail`

### Debugowanie frontendu na Heroku
```bash
# Sprawdź czy build istnieje
heroku run bash
ls -la frontend/build/

# Sprawdź logi z informacjami o ścieżkach
heroku logs --tail | grep "Frontend build"
```

