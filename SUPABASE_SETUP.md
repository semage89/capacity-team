# Konfiguracja Supabase dla Capacity Team Planner

## Informacje o projekcie

- **Project ID**: `aqhcbgwmfuigeykmbmyn`
- **Dashboard URL**: https://supabase.com/dashboard/project/aqhcbgwmfuigeykmbmyn

## Krok 1: Utworzenie projektu w Supabase

✅ Projekt już utworzony!

1. Przejdź do https://supabase.com/dashboard/project/aqhcbgwmfuigeykmbmyn
2. Zaloguj się do swojego konta

## Krok 2: Utworzenie tabeli

1. W Supabase Dashboard przejdź do **SQL Editor**
2. Skopiuj zawartość pliku `supabase_schema.sql`
3. Wklej do SQL Editor i kliknij **Run**

Lub użyj migracji:

```sql
-- Skopiuj zawartość z supabase_schema.sql
```

## Krok 3: Pobranie connection string

1. W Supabase Dashboard przejdź do **Settings** → **Database**
2. Znajdź sekcję **Connection string**
3. Wybierz **URI** (z hasłem) lub **Connection pooling**
4. Format connection string:
   - **Direct connection**: `postgresql://postgres:[PASSWORD]@db.aqhcbgwmfuigeykmbmyn.supabase.co:5432/postgres`
   - **Connection pooling**: `postgresql://postgres.aqhcbgwmfuigeykmbmyn:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
   
   ⚠️ **Uwaga**: Zastąp `[PASSWORD]` swoim hasłem bazy danych i `[REGION]` regionem projektu (np. `eu-central-1`)

## Krok 4: Konfiguracja w Heroku

Ustaw zmienną środowiskową `DATABASE_URL`:

```bash
# Dla direct connection:
heroku config:set DATABASE_URL=postgresql://postgres:[PASSWORD]@db.aqhcbgwmfuigeykmbmyn.supabase.co:5432/postgres -a capacity-team

# LUB dla connection pooling (zalecane dla produkcji):
heroku config:set DATABASE_URL=postgresql://postgres.aqhcbgwmfuigeykmbmyn:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres -a capacity-team
```

Lub przez dashboard Heroku:
1. Settings → Config Vars
2. Dodaj: `DATABASE_URL` = `postgresql://postgres:[PASSWORD]@db.aqhcbgwmfuigeykmbmyn.supabase.co:5432/postgres`

⚠️ **Pamiętaj**: 
- Zastąp `[PASSWORD]` swoim hasłem bazy danych
- Zastąp `[REGION]` regionem projektu (sprawdź w Settings → Database)
- Hasło znajdziesz w Settings → Database → Database password (lub musisz je zresetować)

## Krok 5: Weryfikacja

Po wdrożeniu sprawdź czy baza działa:

```bash
heroku run python -c "from backend.app import app, db; app.app_context().push(); print('Tables:', db.engine.table_names())" -a capacity-team
```

## Struktura bazy danych

### Tabela: `fte_assignments`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | SERIAL | ID przypisania |
| user_email | VARCHAR(255) | Email użytkownika |
| user_display_name | VARCHAR(255) | Wyświetlana nazwa |
| project_key | VARCHAR(50) | Klucz projektu |
| project_name | VARCHAR(255) | Nazwa projektu |
| assignment_date | DATE | Data przypisania |
| fte_value | DECIMAL(3,2) | Wartość FTE (0.0-1.0) |
| created_at | TIMESTAMP | Data utworzenia |
| updated_at | TIMESTAMP | Data aktualizacji |

### Widoki

- `fte_assignments_summary` - Podsumowanie przypisań z agregacjami
- `fte_overload_detection` - Wykrywanie przeciążeń i niedoborów

## Bezpieczeństwo

⚠️ **WAŻNE**: 
- Nie commituj connection string z hasłem do repo
- Używaj zmiennych środowiskowych
- W Supabase ustaw odpowiednie RLS (Row Level Security) jeśli potrzebujesz

## Migracje

Aby dodać nowe kolumny lub tabele w przyszłości:

1. Utwórz plik migracji SQL
2. Uruchom w SQL Editor w Supabase
3. Lub użyj Supabase CLI do migracji

