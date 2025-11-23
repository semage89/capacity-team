# Backend API - Capacity Team Planner

Backend Flask do integracji z Jira i Tempo API.

## Endpointy API

### GET `/api/health`
Sprawdza status API i konfigurację.

**Response:**
```json
{
  "status": "ok",
  "jira_configured": true,
  "tempo_configured": true
}
```

### GET `/api/projects`
Pobiera listę wszystkich projektów z Jira.

**Response:**
```json
[
  {
    "key": "PROJ",
    "name": "Project Name",
    "description": "...",
    ...
  }
]
```

### GET `/api/projects/<project_key>/users`
Pobiera użytkowników przypisanych do projektu.

**Response:**
```json
[
  {
    "displayName": "John Doe",
    "name": "john.doe",
    ...
  }
]
```

### GET `/api/users`
Pobiera wszystkich użytkowników z Jira.

### GET `/api/time/project/<project_key>`
Pobiera wykorzystanie czasu dla projektu.

**Query Parameters:**
- `start_date` (optional): Data początkowa (YYYY-MM-DD)
- `end_date` (optional): Data końcowa (YYYY-MM-DD)

**Response:**
```json
{
  "project_key": "PROJ",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "total_hours": 120.5,
  "user_time": {
    "John Doe": 40.0,
    "Jane Smith": 80.5
  }
}
```

### GET `/api/capacity`
Pobiera capacity dla wszystkich projektów.

**Query Parameters:**
- `start_date` (optional): Data początkowa (YYYY-MM-DD)
- `end_date` (optional): Data końcowa (YYYY-MM-DD)

**Response:**
```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "projects": [
    {
      "key": "PROJ",
      "name": "Project Name",
      "user_count": 5,
      "hours_spent": 120.5,
      "users": [...]
    }
  ]
}
```

## Uruchomienie

```bash
python app.py
```

Aplikacja będzie dostępna na `http://localhost:5000`

