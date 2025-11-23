from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# Załaduj .env z katalogu głównego projektu (dla Heroku) lub z backend (dla lokalnego)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Konfiguracja ścieżki do frontendu
# W Heroku: uruchamiamy z root, więc frontend/build jest względem root
# Lokalnie: backend/app.py, więc trzeba wyjść o poziom wyżej
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_BUILD_PATH = os.path.join(BASE_DIR, 'frontend', 'build')

# Debug: sprawdź czy folder istnieje
if os.path.exists(FRONTEND_BUILD_PATH):
    print(f"✓ Frontend build znaleziony w: {FRONTEND_BUILD_PATH}")
else:
    print(f"✗ Frontend build NIE znaleziony w: {FRONTEND_BUILD_PATH}")
    print(f"  Aktualny katalog roboczy: {os.getcwd()}")
    print(f"  BASE_DIR: {BASE_DIR}")
    # Spróbuj alternatywną ścieżkę
    alt_path = os.path.join(os.getcwd(), 'frontend', 'build')
    if os.path.exists(alt_path):
        FRONTEND_BUILD_PATH = alt_path
        print(f"✓ Używam alternatywnej ścieżki: {FRONTEND_BUILD_PATH}")

app = Flask(__name__, static_folder=FRONTEND_BUILD_PATH if os.path.exists(FRONTEND_BUILD_PATH) else None, static_url_path='')
CORS(app)

# Konfiguracja Jira
JIRA_URL = os.getenv('JIRA_URL')
JIRA_EMAIL = os.getenv('JIRA_EMAIL')
JIRA_API_TOKEN = os.getenv('JIRA_API_TOKEN')
TEMPO_API_TOKEN = os.getenv('TEMPO_API_TOKEN')

# Headers dla autoryzacji
JIRA_AUTH = (JIRA_EMAIL, JIRA_API_TOKEN)
TEMPO_HEADERS = {
    'Authorization': f'Bearer {TEMPO_API_TOKEN}',
    'Content-Type': 'application/json'
}


class JiraClient:
    """Klient do komunikacji z Jira API"""
    
    def __init__(self, base_url: str, auth: tuple):
        self.base_url = base_url.rstrip('/')
        self.auth = auth
        self.api_url = f"{self.base_url}/rest/api/3"
    
    def get_projects(self) -> List[Dict]:
        """Pobiera listę wszystkich projektów"""
        try:
            response = requests.get(
                f"{self.api_url}/project",
                auth=self.auth,
                params={'expand': 'description,lead'}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Błąd podczas pobierania projektów: {e}")
            return []
    
    def get_project_users(self, project_key: str) -> List[Dict]:
        """Pobiera użytkowników przypisanych do projektu"""
        try:
            # Pobierz użytkowników z projektu
            response = requests.get(
                f"{self.api_url}/project/{project_key}/role",
                auth=self.auth
            )
            response.raise_for_status()
            roles = response.json()
            
            users = []
            # Pobierz użytkowników z roli "Users"
            if 'Users' in roles:
                users_url = roles['Users']
                users_response = requests.get(users_url, auth=self.auth)
                users_response.raise_for_status()
                users_data = users_response.json()
                users = users_data.get('actors', [])
            
            return users
        except Exception as e:
            print(f"Błąd podczas pobierania użytkowników projektu: {e}")
            return []
    
    def get_all_users(self) -> List[Dict]:
        """Pobiera wszystkich użytkowników z Jira"""
        try:
            users = []
            start_at = 0
            max_results = 50
            
            while True:
                response = requests.get(
                    f"{self.api_url}/users/search",
                    auth=self.auth,
                    params={
                        'startAt': start_at,
                        'maxResults': max_results
                    }
                )
                response.raise_for_status()
                batch = response.json()
                
                if not batch:
                    break
                
                users.extend(batch)
                start_at += max_results
                
                if len(batch) < max_results:
                    break
            
            return users
        except Exception as e:
            print(f"Błąd podczas pobierania użytkowników: {e}")
            return []


class TempoClient:
    """Klient do komunikacji z Tempo API"""
    
    def __init__(self, base_url: str, headers: Dict):
        self.base_url = base_url.rstrip('/')
        self.headers = headers
        # Tempo API może używać różnych endpointów w zależności od wersji
        # Spróbuj najpierw nowszej wersji, potem starszej
        self.api_urls = [
            f"{self.base_url}/rest/tempo-timesheets/4",
            f"{self.base_url}/rest/tempo-timesheets/3",
            f"{self.base_url}/rest/tempo-core/1"
        ]
        self.api_url = self.api_urls[0]  # Domyślnie najnowsza
    
    def get_worklogs(self, project_key: Optional[str] = None, 
                     start_date: Optional[str] = None,
                     end_date: Optional[str] = None,
                     user: Optional[str] = None) -> List[Dict]:
        """Pobiera worklogi z Tempo"""
        # Spróbuj różnych endpointów API
        for api_url in self.api_urls:
            try:
                params = {}
                if project_key:
                    params['projectKey'] = project_key
                if start_date:
                    params['from'] = start_date
                if end_date:
                    params['to'] = end_date
                if user:
                    params['username'] = user
                
                # Różne wersje API mogą używać różnych endpointów
                endpoints = [
                    f"{api_url}/worklogs",
                    f"{api_url}/worklogs/search",
                    f"{self.base_url}/rest/tempo-timesheets/4/worklogs"
                ]
                
                for endpoint in endpoints:
                    try:
                        response = requests.get(
                            endpoint,
                            headers=self.headers,
                            params=params,
                            timeout=10
                        )
                        if response.status_code == 200:
                            data = response.json()
                            # Sprawdź format odpowiedzi
                            if isinstance(data, list):
                                return data
                            elif isinstance(data, dict) and 'results' in data:
                                return data['results']
                            elif isinstance(data, dict) and 'worklogs' in data:
                                return data['worklogs']
                            return data if isinstance(data, list) else []
                    except requests.exceptions.RequestException:
                        continue
            except Exception as e:
                print(f"Błąd podczas pobierania worklogów z {api_url}: {e}")
                continue
        
        print("Nie udało się połączyć z Tempo API. Sprawdź konfigurację.")
        return []
    
    def get_time_per_project(self, start_date: str, end_date: str) -> Dict[str, float]:
        """Pobiera czas spędzony per projekt w podanym okresie"""
        worklogs = self.get_worklogs(start_date=start_date, end_date=end_date)
        
        project_time = {}
        for worklog in worklogs:
            project_key = worklog.get('issue', {}).get('projectKey', 'Unknown')
            time_spent = worklog.get('timeSpentSeconds', 0) / 3600  # konwersja na godziny
            
            if project_key not in project_time:
                project_time[project_key] = 0
            project_time[project_key] += time_spent
        
        return project_time


# Inicjalizacja klientów
jira_client = JiraClient(JIRA_URL, JIRA_AUTH) if JIRA_URL and JIRA_EMAIL and JIRA_API_TOKEN else None
tempo_client = TempoClient(JIRA_URL, TEMPO_HEADERS) if JIRA_URL and TEMPO_API_TOKEN else None


@app.route('/api/health', methods=['GET'])
def health():
    """Sprawdza status API"""
    return jsonify({
        'status': 'ok',
        'jira_configured': jira_client is not None,
        'tempo_configured': tempo_client is not None
    })


@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Pobiera listę projektów"""
    if not jira_client:
        return jsonify({'error': 'Jira nie jest skonfigurowane'}), 500
    
    projects = jira_client.get_projects()
    return jsonify(projects)


@app.route('/api/projects/<project_key>/users', methods=['GET'])
def get_project_users(project_key: str):
    """Pobiera użytkowników przypisanych do projektu"""
    if not jira_client:
        return jsonify({'error': 'Jira nie jest skonfigurowane'}), 500
    
    users = jira_client.get_project_users(project_key)
    return jsonify(users)


@app.route('/api/users', methods=['GET'])
def get_users():
    """Pobiera wszystkich użytkowników"""
    if not jira_client:
        return jsonify({'error': 'Jira nie jest skonfigurowane'}), 500
    
    users = jira_client.get_all_users()
    return jsonify(users)


@app.route('/api/time/project/<project_key>', methods=['GET'])
def get_project_time(project_key: str):
    """Pobiera wykorzystanie czasu dla projektu"""
    if not tempo_client:
        return jsonify({'error': 'Tempo nie jest skonfigurowane'}), 500
    
    # Pobierz parametry dat z query string
    start_date = request.args.get('start_date', 
                                  (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
    
    worklogs = tempo_client.get_worklogs(
        project_key=project_key,
        start_date=start_date,
        end_date=end_date
    )
    
    # Grupuj po użytkownikach
    user_time = {}
    total_time = 0
    
    for worklog in worklogs:
        user = worklog.get('author', {}).get('displayName', 'Unknown')
        time_spent = worklog.get('timeSpentSeconds', 0) / 3600  # godziny
        
        if user not in user_time:
            user_time[user] = 0
        user_time[user] += time_spent
        total_time += time_spent
    
    return jsonify({
        'project_key': project_key,
        'start_date': start_date,
        'end_date': end_date,
        'total_hours': round(total_time, 2),
        'user_time': {k: round(v, 2) for k, v in user_time.items()}
    })


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serwuje frontend React"""
    # Nie serwuj plików API przez ten endpoint
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    static_folder = app.static_folder
    
    # Jeśli nie ma static_folder, spróbuj znaleźć build
    if not static_folder or not os.path.exists(static_folder):
        static_folder = FRONTEND_BUILD_PATH
    
    if static_folder and os.path.exists(static_folder):
        # Jeśli ścieżka jest pusta lub to katalog, zwróć index.html
        if path == '' or path.endswith('/'):
            index_path = os.path.join(static_folder, 'index.html')
            if os.path.exists(index_path):
                return send_from_directory(static_folder, 'index.html')
        
        # Spróbuj znaleźć plik
        file_path = os.path.join(static_folder, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(static_folder, path)
        
        # Jeśli plik nie istnieje, ale to nie jest API, zwróć index.html (SPA routing)
        index_path = os.path.join(static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder, 'index.html')
    
    # Jeśli frontend nie jest zbudowany, zwróć informację
    return jsonify({
        'message': 'Frontend nie jest dostępny. Upewnij się, że został zbudowany.',
        'api_status': 'ok',
        'static_folder': static_folder,
        'exists': os.path.exists(static_folder) if static_folder else False,
        'current_dir': os.getcwd(),
        'base_dir': BASE_DIR
    }), 200


@app.route('/api/capacity', methods=['GET'])
def get_capacity():
    """Pobiera capacity dla wszystkich projektów"""
    if not jira_client or not tempo_client:
        return jsonify({'error': 'Jira lub Tempo nie jest skonfigurowane'}), 500
    
    # Pobierz parametry dat
    start_date = request.args.get('start_date', 
                                  (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
    
    # Pobierz projekty
    projects = jira_client.get_projects()
    
    # Pobierz czas per projekt
    project_time = tempo_client.get_time_per_project(start_date, end_date)
    
    # Połącz dane
    capacity_data = []
    for project in projects:
        project_key = project.get('key')
        project_name = project.get('name', project_key)
        
        # Pobierz użytkowników projektu
        users = jira_client.get_project_users(project_key)
        
        # Pobierz czas dla projektu
        hours_spent = project_time.get(project_key, 0)
        
        capacity_data.append({
            'key': project_key,
            'name': project_name,
            'user_count': len(users),
            'hours_spent': round(hours_spent, 2),
            'users': [{'displayName': u.get('displayName', u.get('name', 'Unknown'))} 
                     for u in users[:10]]  # Limit do 10 użytkowników
        })
    
    return jsonify({
        'start_date': start_date,
        'end_date': end_date,
        'projects': capacity_data
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)

