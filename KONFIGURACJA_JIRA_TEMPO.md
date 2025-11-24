# Konfiguracja połączenia z Jirą i Tempo

## Dane potrzebne do połączenia

### 1. Jira API - Wymagane dane

Aby połączyć się z Jirą, potrzebujesz:

#### a) URL Twojej instancji Jira
- **Format**: `https://twoja-domena.atlassian.net`
- **Przykład**: `https://moja-firma.atlassian.net`
- **Gdzie znaleźć**: To jest URL, pod którym logujesz się do Jira w przeglądarce

#### b) Email użytkownika
- **Format**: Twój email używany do logowania w Jira
- **Przykład**: `jan.kowalski@firma.pl`
- **Uwaga**: Musi to być email konta, które ma dostęp do projektów, które chcesz przeglądać

#### c) API Token
- **Co to jest**: Token API służy do autoryzacji zamiast hasła
- **Jak wygenerować**:
  1. Zaloguj się do swojego konta Atlassian: https://id.atlassian.com/manage-profile/security/api-tokens
  2. Kliknij **"Create API token"**
  3. Nadaj nazwę tokenowi (np. "Capacity Planner")
  4. Kliknij **"Create"**
  5. **WAŻNE**: Skopiuj token natychmiast - będzie widoczny tylko raz!
  6. Format: długi ciąg znaków, np. `ATATT3xFfGF0...` (około 100+ znaków)

---

### 2. Tempo API - Opcjonalne dane

Tempo jest opcjonalne - aplikacja działa bez niego, ale bez Tempo nie będziesz widzieć danych o czasie.

#### a) Tempo API Token
- **Co to jest**: Token do dostępu do Tempo Time Tracking API
- **Jak wygenerować**:
  1. Zaloguj się do Jira jako administrator
  2. Przejdź do **Settings** (Ustawienia) → **Apps** → **Tempo**
  3. Lub bezpośrednio: `https://twoja-domena.atlassian.net/plugins/servlet/ac/io.tempo.jira/tempo-app#!/configuration/api`
  4. W sekcji **"API Tokens"** kliknij **"Generate new token"**
  5. Nadaj nazwę tokenowi
  6. Skopiuj wygenerowany token
  7. Format: podobny do Jira token, np. `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Uwaga**: Jeśli nie masz uprawnień administratora, poproś administratora Jira o wygenerowanie tokenu.

---

## Gdzie skonfigurować te dane

### W aplikacji lokalnej:

1. Utwórz plik `.env` w katalogu `backend/`
2. Wypełnij następujące zmienne:

```env
JIRA_URL=https://twoja-domena.atlassian.net
JIRA_EMAIL=twoj-email@firma.pl
JIRA_API_TOKEN=twój-jira-api-token
TEMPO_API_TOKEN=twój-tempo-api-token
```

### Na Heroku:

Użyj jednej z metod:

#### Metoda 1: Przez Heroku CLI
```bash
heroku config:set JIRA_URL=https://twoja-domena.atlassian.net -a capacity-team
heroku config:set JIRA_EMAIL=twoj-email@firma.pl -a capacity-team
heroku config:set JIRA_API_TOKEN=twój-jira-api-token -a capacity-team
heroku config:set TEMPO_API_TOKEN=twój-tempo-api-token -a capacity-team
```

#### Metoda 2: Przez Dashboard Heroku
1. Przejdź do swojej aplikacji na Heroku
2. Kliknij **Settings**
3. W sekcji **Config Vars** kliknij **Reveal Config Vars**
4. Dodaj każdą zmienną osobno:
   - Key: `JIRA_URL`, Value: `https://twoja-domena.atlassian.net`
   - Key: `JIRA_EMAIL`, Value: `twoj-email@firma.pl`
   - Key: `JIRA_API_TOKEN`, Value: `twój-token`
   - Key: `TEMPO_API_TOKEN`, Value: `twój-tempo-token`

---

## Przykładowa konfiguracja

```env
# Jira Configuration
JIRA_URL=https://moja-firma.atlassian.net
JIRA_EMAIL=jan.kowalski@firma.pl
JIRA_API_TOKEN=ATATT3xFfGF0k7bEoP1nM3uN4Km5pQrS7tUvWxYz1234567890abcdefghijklmnopqrstuvwxyz

# Tempo Configuration (opcjonalne)
TEMPO_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
```

---

## Weryfikacja konfiguracji

Po skonfigurowaniu, możesz sprawdzić czy wszystko działa:

1. **Lokalnie**: Uruchom aplikację i sprawdź endpoint `/api/health`
2. **Na Heroku**: Otwórz `https://twoja-aplikacja.herokuapp.com/api/health`

Powinieneś zobaczyć:
```json
{
  "status": "ok",
  "jira_configured": true,
  "tempo_configured": true
}
```

---

## Rozwiązywanie problemów

### Błąd: "Jira nie jest skonfigurowane"
- Sprawdź czy wszystkie zmienne są ustawione
- Sprawdź czy `JIRA_URL` nie ma końcowego slasha (`/`)
- Sprawdź czy token jest poprawny (skopiowany w całości)

### Błąd: "Unauthorized" lub "403 Forbidden"
- Sprawdź czy email jest poprawny
- Sprawdź czy API token jest poprawny
- Sprawdź czy konto ma dostęp do projektów

### Błąd: "Tempo nie jest skonfigurowane"
- To jest normalne, jeśli nie używasz Tempo
- Jeśli używasz, sprawdź czy token jest poprawny
- Sprawdź czy masz uprawnienia administratora w Jira

---

## Bezpieczeństwo

⚠️ **WAŻNE**: Nigdy nie commituj plików `.env` do repozytorium!

- Plik `.env` jest już w `.gitignore`
- Tokeny API są wrażliwe - traktuj je jak hasła
- Jeśli token wycieknie, natychmiast go usuń i wygeneruj nowy
- Nie udostępniaj tokenów w komunikacji (email, chat, etc.)

---

## Potrzebujesz pomocy?

Jeśli masz problemy z konfiguracją:
1. Sprawdź logi aplikacji: `heroku logs --tail`
2. Sprawdź czy tokeny są poprawne
3. Sprawdź czy masz dostęp do projektów w Jira

