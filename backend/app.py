from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from .models import db, FTEAssignment
from sqlalchemy import func, and_, extract

# Załaduj .env z katalogu głównego projektu (dla Heroku) lub z backend (dla lokalnego)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

# Konfiguracja ścieżki do frontendu
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_BUILD_PATH = os.path.join(BASE_DIR, 'frontend', 'build')

possible_paths = [
    FRONTEND_BUILD_PATH,
    os.path.join(os.getcwd(), 'frontend', 'build'),
    '/app/frontend/build',
]

FRONTEND_BUILD_PATH = None
for path in possible_paths:
    if os.path.exists(path):
        FRONTEND_BUILD_PATH = path
        print(f"✓ Frontend build znaleziony w: {FRONTEND_BUILD_PATH}")
        break

if not FRONTEND_BUILD_PATH:
    print(f"✗ Frontend build NIE znaleziony w żadnej z lokalizacji:")
    for path in possible_paths:
        print(f"  - {path} (istnieje: {os.path.exists(path)})")
    FRONTEND_BUILD_PATH = possible_paths[1]

app = Flask(__name__, static_folder=FRONTEND_BUILD_PATH, static_url_path='')
CORS(app)

# Konfiguracja bazy danych
database_url = os.getenv('DATABASE_URL', 'sqlite:///capacity_planner.db')
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Konfiguracja Jira
JIRA_URL = os.getenv('JIRA_URL')
JIRA_EMAIL = os.getenv('JIRA_EMAIL')
JIRA_API_TOKEN = os.getenv('JIRA_API_TOKEN')
TEMPO_API_TOKEN = os.getenv('TEMPO_API_TOKEN')

JIRA_AUTH = (JIRA_EMAIL, JIRA_API_TOKEN) if JIRA_EMAIL and JIRA_API_TOKEN else None
TEMPO_HEADERS = {
    'Authorization': f'Bearer {TEMPO_API_TOKEN}',
    'Content-Type': 'application/json'
} if TEMPO_API_TOKEN else {}


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
            response = requests.get(
                f"{self.api_url}/project/{project_key}/role",
                auth=self.auth
            )
            response.raise_for_status()
            roles = response.json()
            
            users = []
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
        """Pobiera wszystkich aktywnych użytkowników z Jira"""
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
                        'maxResults': max_results,
                        'active': True  # Tylko aktywni użytkownicy
                    }
                )
                response.raise_for_status()
                batch = response.json()
                
                if not batch:
                    break
                
                # Dodatkowe filtrowanie aktywnych (na wypadek gdyby API nie przefiltrowało)
                active_users = [u for u in batch if u.get('active', True)]
                users.extend(active_users)
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
        self.api_urls = [
            f"{self.base_url}/rest/tempo-timesheets/4",
            f"{self.base_url}/rest/tempo-timesheets/3",
            f"{self.base_url}/rest/tempo-core/1"
        ]
        self.api_url = self.api_urls[0]
    
    def get_worklogs(self, project_key: Optional[str] = None, 
                     start_date: Optional[str] = None,
                     end_date: Optional[str] = None,
                     user: Optional[str] = None) -> List[Dict]:
        """Pobiera worklogi z Tempo"""
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
            time_spent = worklog.get('timeSpentSeconds', 0) / 3600
            
            if project_key not in project_time:
                project_time[project_key] = 0
            project_time[project_key] += time_spent
        
        return project_time


# Inicjalizacja klientów
try:
    jira_client = JiraClient(JIRA_URL, JIRA_AUTH) if JIRA_URL and JIRA_EMAIL and JIRA_API_TOKEN else None
    tempo_client = TempoClient(JIRA_URL, TEMPO_HEADERS) if JIRA_URL and TEMPO_API_TOKEN else None
    print(f"✓ Klienci zainicjalizowani: Jira={jira_client is not None}, Tempo={tempo_client is not None}")
except Exception as e:
    print(f"✗ Błąd podczas inicjalizacji klientów: {e}")
    jira_client = None
    tempo_client = None


# Inicjalizacja bazy danych
with app.app_context():
    db.create_all()
    # Usuń przypisania na weekendy przy starcie
    try:
        all_assignments = FTEAssignment.query.all()
        weekend_assignments = [a for a in all_assignments if a.assignment_date.weekday() >= 5]
        if weekend_assignments:
            for assignment in weekend_assignments:
                db.session.delete(assignment)
            db.session.commit()
            print(f"✓ Usunięto {len(weekend_assignments)} przypisań na weekendy przy starcie")
    except Exception as e:
        print(f"⚠ Błąd podczas czyszczenia weekendów: {e}")


@app.route('/api/health', methods=['GET'])
def health():
    """Sprawdza status API"""
    return jsonify({
        'status': 'ok',
        'jira_configured': jira_client is not None,
        'tempo_configured': tempo_client is not None
    })


# ========== FTE Management Endpoints ==========

@app.route('/api/fte', methods=['GET'])
def get_fte_assignments():
    """Pobiera przypisania FTE z opcjonalnymi filtrami"""
    project_key = request.args.get('project_key')
    user_email = request.args.get('user_email')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = FTEAssignment.query
    
    if project_key:
        query = query.filter(FTEAssignment.project_key == project_key)
    if user_email:
        query = query.filter(FTEAssignment.user_email == user_email)
    if start_date:
        query = query.filter(FTEAssignment.assignment_date >= datetime.fromisoformat(start_date).date())
    if end_date:
        query = query.filter(FTEAssignment.assignment_date <= datetime.fromisoformat(end_date).date())
    
    assignments = query.order_by(FTEAssignment.assignment_date.desc()).all()
    return jsonify([a.to_dict() for a in assignments])


@app.route('/api/fte', methods=['POST'])
def create_fte_assignment():
    """Tworzy nowe przypisanie FTE"""
    data = request.json
    
    required_fields = ['user_email', 'user_display_name', 'project_key', 'project_name', 'assignment_date', 'fte_value']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Brakuje pola: {field}'}), 400
    
    # Walidacja FTE (0.0 - 1.0)
    fte_value = float(data['fte_value'])
    if fte_value < 0 or fte_value > 1:
        return jsonify({'error': 'FTE musi być między 0.0 a 1.0'}), 400
    
    # Sprawdź czy już istnieje
    assignment_date = datetime.fromisoformat(data['assignment_date']).date()
    
    # Blokuj weekendy (sobota = 5, niedziela = 6)
    if assignment_date.weekday() >= 5:
        return jsonify({'error': 'Nie można przypisywać FTE na weekendy (sobota i niedziela)'}), 400
    existing = FTEAssignment.query.filter_by(
        user_email=data['user_email'],
        project_key=data['project_key'],
        assignment_date=assignment_date
    ).first()
    
    if existing:
        # Aktualizuj istniejące
        existing.fte_value = fte_value
        existing.user_display_name = data['user_display_name']
        existing.project_name = data['project_name']
        existing.updated_at = datetime.now()
        db.session.commit()
        return jsonify(existing.to_dict()), 200
    
    # Utwórz nowe
    assignment = FTEAssignment(
        user_email=data['user_email'],
        user_display_name=data['user_display_name'],
        project_key=data['project_key'],
        project_name=data['project_name'],
        assignment_date=assignment_date,
        fte_value=fte_value
    )
    
    db.session.add(assignment)
    db.session.commit()
    
    return jsonify(assignment.to_dict()), 201


@app.route('/api/fte/<int:assignment_id>', methods=['PUT'])
def update_fte_assignment(assignment_id):
    """Aktualizuje przypisanie FTE"""
    assignment = FTEAssignment.query.get_or_404(assignment_id)
    data = request.json
    
    if 'fte_value' in data:
        fte_value = float(data['fte_value'])
        if fte_value < 0 or fte_value > 1:
            return jsonify({'error': 'FTE musi być między 0.0 a 1.0'}), 400
        assignment.fte_value = fte_value
    
    if 'user_display_name' in data:
        assignment.user_display_name = data['user_display_name']
    if 'project_name' in data:
        assignment.project_name = data['project_name']
    
    assignment.updated_at = datetime.now()
    db.session.commit()
    
    return jsonify(assignment.to_dict())


@app.route('/api/fte/<int:assignment_id>', methods=['DELETE'])
def delete_fte_assignment(assignment_id):
    """Usuwa przypisanie FTE"""
    assignment = FTEAssignment.query.get_or_404(assignment_id)
    db.session.delete(assignment)
    db.session.commit()
    
    return jsonify({'message': 'Przypisanie FTE zostało usunięte'}), 200


@app.route('/api/fte/range', methods=['POST'])
def create_fte_range():
    """Tworzy przypisania FTE na okres czasu"""
    data = request.json
    
    required_fields = ['user_email', 'user_display_name', 'project_key', 'project_name', 'start_date', 'end_date', 'fte_value']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Brakuje pola: {field}'}), 400
    
    fte_value = float(data['fte_value'])
    if fte_value < 0 or fte_value > 1:
        return jsonify({'error': 'FTE musi być między 0.0 a 1.0'}), 400
    
    start_date = datetime.fromisoformat(data['start_date']).date()
    end_date = datetime.fromisoformat(data['end_date']).date()
    
    if start_date > end_date:
        return jsonify({'error': 'Data początkowa musi być przed datą końcową'}), 400
    
    # Generuj wszystkie dni w zakresie (tylko dni robocze - pn-pt)
    created = []
    updated = []
    current = start_date
    
    while current <= end_date:
        # Pomiń weekendy (sobota = 5, niedziela = 6)
        if current.weekday() < 5:  # 0-4 to poniedziałek-piątek
            existing = FTEAssignment.query.filter_by(
            user_email=data['user_email'],
            project_key=data['project_key'],
            assignment_date=current
        ).first()
        
        if existing:
            existing.fte_value = fte_value
            existing.user_display_name = data['user_display_name']
            existing.project_name = data['project_name']
            existing.updated_at = datetime.now()
            updated.append(existing.to_dict())
        else:
            assignment = FTEAssignment(
                user_email=data['user_email'],
                user_display_name=data['user_display_name'],
                project_key=data['project_key'],
                project_name=data['project_name'],
                assignment_date=current,
                fte_value=fte_value
            )
            db.session.add(assignment)
            created.append(assignment.to_dict())
        
        current += timedelta(days=1)
    
    db.session.commit()
    
    return jsonify({
        'message': f'Utworzono {len(created)} nowych przypisań, zaktualizowano {len(updated)} istniejących',
        'created': len(created),
        'updated': len(updated),
        'total_days': (end_date - start_date).days + 1
    }), 201


@app.route('/api/fte/bulk', methods=['POST'])
def bulk_create_fte():
    """Tworzy wiele przypisań FTE naraz"""
    data = request.json
    assignments_data = data.get('assignments', [])
    
    created = []
    updated = []
    errors = []
    
    for item in assignments_data:
        try:
            required_fields = ['user_email', 'user_display_name', 'project_key', 'project_name', 'assignment_date', 'fte_value']
            for field in required_fields:
                if field not in item:
                    errors.append({'item': item, 'error': f'Brakuje pola: {field}'})
                    break
            else:
                fte_value = float(item['fte_value'])
                if fte_value < 0 or fte_value > 1:
                    errors.append({'item': item, 'error': 'FTE musi być między 0.0 a 1.0'})
                    continue
                
                assignment_date = datetime.fromisoformat(item['assignment_date']).date()
                existing = FTEAssignment.query.filter_by(
                    user_email=item['user_email'],
                    project_key=item['project_key'],
                    assignment_date=assignment_date
                ).first()
                
                if existing:
                    existing.fte_value = fte_value
                    existing.user_display_name = item['user_display_name']
                    existing.project_name = item['project_name']
                    existing.updated_at = datetime.now()
                    updated.append(existing.to_dict())
                else:
                    assignment = FTEAssignment(
                        user_email=item['user_email'],
                        user_display_name=item['user_display_name'],
                        project_key=item['project_key'],
                        project_name=item['project_name'],
                        assignment_date=assignment_date,
                        fte_value=fte_value
                    )
                    db.session.add(assignment)
                    created.append(assignment.to_dict())
        except Exception as e:
            errors.append({'item': item, 'error': str(e)})
    
    db.session.commit()
    
    return jsonify({
        'created': len(created),
        'updated': len(updated),
        'errors': len(errors),
        'assignments': created + updated,
        'error_details': errors
    }), 200


# ========== Time Verification Endpoints ==========

@app.route('/api/team/calendar', methods=['GET'])
def get_team_calendar():
    """Pobiera dane kalendarza zespołu z alokacjami FTE"""
    start_date = request.args.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'))
    project_key = request.args.get('project_key')
    user_email = request.args.get('user_email')
    
    # Pobierz wszystkie przypisania FTE w zakresie
    query = FTEAssignment.query.filter(
        FTEAssignment.assignment_date >= datetime.fromisoformat(start_date).date(),
        FTEAssignment.assignment_date <= datetime.fromisoformat(end_date).date()
    )
    
    if project_key:
        query = query.filter(FTEAssignment.project_key == project_key)
    if user_email:
        query = query.filter(FTEAssignment.user_email == user_email)
    
    assignments = query.order_by(FTEAssignment.assignment_date, FTEAssignment.user_email).all()
    
    # Grupuj po użytkownikach i datach
    calendar_data = {}
    for assignment in assignments:
        user_key = assignment.user_email
        date_str = assignment.assignment_date.isoformat()
        
        if user_key not in calendar_data:
            calendar_data[user_key] = {
                'user_email': assignment.user_email,
                'user_display_name': assignment.user_display_name,
                'days': {}
            }
        
        if date_str not in calendar_data[user_key]['days']:
            calendar_data[user_key]['days'][date_str] = []
        
        calendar_data[user_key]['days'][date_str].append({
            'project_key': assignment.project_key,
            'project_name': assignment.project_name,
            'fte': assignment.fte_value,
            'assignment_id': assignment.id
        })
    
    # Oblicz total FTE per dzień i wykryj przeciążenia
    for user_key, user_data in calendar_data.items():
        for date_str, projects in user_data['days'].items():
            total_fte = sum(p['fte'] for p in projects)
            user_data['days'][date_str] = {
                'projects': projects,
                'total_fte': round(total_fte, 2),
                'overloaded': total_fte > 1.0,
                'underutilized': total_fte < 0.8 and total_fte > 0
            }
    
    return jsonify({
        'start_date': start_date,
        'end_date': end_date,
        'calendar': list(calendar_data.values())
    })


@app.route('/api/optimization/suggestions', methods=['GET'])
def get_optimization_suggestions():
    """Zwraca sugestie optymalizacji obłożenia pracy"""
    start_date = request.args.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'))
    
    # Pobierz wszystkie przypisania
    assignments = FTEAssignment.query.filter(
        FTEAssignment.assignment_date >= datetime.fromisoformat(start_date).date(),
        FTEAssignment.assignment_date <= datetime.fromisoformat(end_date).date()
    ).all()
    
    # Analizuj przeciążenia i niedobory
    overloaded = []
    underutilized = []
    conflicts = []
    
    # Grupuj po użytkownikach i datach
    user_days = {}
    for assignment in assignments:
        key = f"{assignment.user_email}_{assignment.assignment_date.isoformat()}"
        if key not in user_days:
            user_days[key] = {
                'user': assignment.user_email,
                'user_display_name': assignment.user_display_name,
                'date': assignment.assignment_date.isoformat(),
                'projects': [],
                'total_fte': 0
            }
        user_days[key]['projects'].append({
            'project_key': assignment.project_key,
            'project_name': assignment.project_name,
            'fte': assignment.fte_value
        })
        user_days[key]['total_fte'] += assignment.fte_value
    
    # Wykryj problemy
    for key, day_data in user_days.items():
        if day_data['total_fte'] > 1.0:
            overloaded.append({
                'user_email': day_data['user'],
                'user_display_name': day_data['user_display_name'],
                'date': day_data['date'],
                'total_fte': round(day_data['total_fte'], 2),
                'overload': round(day_data['total_fte'] - 1.0, 2),
                'projects': day_data['projects'],
                'suggestion': f"Zmniejsz alokację o {round((day_data['total_fte'] - 1.0) * 100, 1)}%"
            })
        elif day_data['total_fte'] < 0.8 and day_data['total_fte'] > 0:
            underutilized.append({
                'user_email': day_data['user'],
                'user_display_name': day_data['user_display_name'],
                'date': day_data['date'],
                'total_fte': round(day_data['total_fte'], 2),
                'available_capacity': round(1.0 - day_data['total_fte'], 2),
                'projects': day_data['projects'],
                'suggestion': f"Dostępna pojemność: {round((1.0 - day_data['total_fte']) * 100, 1)}%"
            })
    
    return jsonify({
        'start_date': start_date,
        'end_date': end_date,
        'overloaded': overloaded,
        'underutilized': underutilized,
        'summary': {
            'total_overloaded_days': len(overloaded),
            'total_underutilized_days': len(underutilized),
            'overload_percentage': round(len(overloaded) / max(len(user_days), 1) * 100, 1) if user_days else 0
        }
    })


@app.route('/api/verification/time', methods=['GET'])
def verify_time():
    """Weryfikuje czas spędzony vs FTE capacity"""
    project_key = request.args.get('project_key')
    user_email = request.args.get('user_email')
    start_date = request.args.get('start_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
    
    if not tempo_client:
        return jsonify({'error': 'Tempo nie jest skonfigurowane'}), 500
    
    # Pobierz worklogi z Tempo
    worklogs = tempo_client.get_worklogs(
        project_key=project_key,
        start_date=start_date,
        end_date=end_date,
        user=user_email
    )
    
    # Pobierz przypisania FTE
    fte_query = FTEAssignment.query.filter(
        FTEAssignment.assignment_date >= datetime.fromisoformat(start_date).date(),
        FTEAssignment.assignment_date <= datetime.fromisoformat(end_date).date()
    )
    
    if project_key:
        fte_query = fte_query.filter(FTEAssignment.project_key == project_key)
    if user_email:
        fte_query = fte_query.filter(FTEAssignment.user_email == user_email)
    
    fte_assignments = fte_query.all()
    
    # Grupuj worklogi po użytkownikach i datach
    user_time = {}  # {user_email: {date: hours}}
    for worklog in worklogs:
        # Różne formaty danych z Tempo API
        author = worklog.get('author', {})
        user = author.get('emailAddress') or author.get('accountId') or author.get('displayName') or 'Unknown'
        
        # Różne formaty dat z Tempo
        work_date = (worklog.get('startDate') or 
                    worklog.get('dateStarted') or 
                    worklog.get('start') or 
                    worklog.get('date'))
        
        # Jeśli data jest w formacie timestamp, przekonwertuj
        if isinstance(work_date, (int, float)):
            work_date = datetime.fromtimestamp(work_date / 1000 if work_date > 1e10 else work_date).strftime('%Y-%m-%d')
        elif isinstance(work_date, str):
            # Spróbuj różne formaty dat
            try:
                if 'T' in work_date:
                    work_date = datetime.fromisoformat(work_date.replace('Z', '+00:00')).strftime('%Y-%m-%d')
                else:
                    work_date = datetime.strptime(work_date, '%Y-%m-%d').strftime('%Y-%m-%d')
            except:
                # Jeśli nie można sparsować, użyj jak jest
                pass
        
        time_spent = worklog.get('timeSpentSeconds', 0) / 3600  # godziny
        
        if user not in user_time:
            user_time[user] = {}
        if work_date not in user_time[user]:
            user_time[user][work_date] = 0
        user_time[user][work_date] += time_spent
    
    # Grupuj FTE po użytkownikach i datach
    user_fte = {}  # {user_email: {date: fte_value}}
    for assignment in fte_assignments:
        if assignment.user_email not in user_fte:
            user_fte[assignment.user_email] = {}
        user_fte[assignment.user_email][assignment.assignment_date.isoformat()] = assignment.fte_value
    
    # Oblicz capacity i wykorzystanie
    verification_results = []
    
    # Dla każdego użytkownika
    for user_email, time_by_date in user_time.items():
        user_fte_data = user_fte.get(user_email, {})
        
        total_time_spent = sum(time_by_date.values())
        total_capacity_hours = 0
        
        # Dla każdego dnia w okresie
        start = datetime.fromisoformat(start_date).date()
        end = datetime.fromisoformat(end_date).date()
        current = start
        
        daily_details = []
        while current <= end:
            date_str = current.isoformat()
            hours_spent = time_by_date.get(date_str, 0)
            fte = user_fte_data.get(date_str, 0)
            
            # Zakładamy 8 godzin dziennie jako pełny dzień pracy
            capacity_hours = fte * 8
            total_capacity_hours += capacity_hours
            
            utilization = (hours_spent / capacity_hours * 100) if capacity_hours > 0 else 0
            
            daily_details.append({
                'date': date_str,
                'hours_spent': round(hours_spent, 2),
                'fte': fte,
                'capacity_hours': round(capacity_hours, 2),
                'utilization_percent': round(utilization, 2)
            })
            
            current += timedelta(days=1)
        
        utilization_percent = (total_time_spent / total_capacity_hours * 100) if total_capacity_hours > 0 else 0
        
        verification_results.append({
            'user_email': user_email,
            'user_display_name': fte_assignments[0].user_display_name if fte_assignments and fte_assignments[0].user_email == user_email else user_email,
            'start_date': start_date,
            'end_date': end_date,
            'total_time_spent_hours': round(total_time_spent, 2),
            'total_capacity_hours': round(total_capacity_hours, 2),
            'utilization_percent': round(utilization_percent, 2),
            'daily_details': daily_details
        })
    
    # Dodaj użytkowników z FTE ale bez czasu
    for user_email, fte_by_date in user_fte.items():
        if user_email not in user_time:
            assignment = next((a for a in fte_assignments if a.user_email == user_email), None)
            if assignment:
                start = datetime.fromisoformat(start_date).date()
                end = datetime.fromisoformat(end_date).date()
                current = start
                total_capacity_hours = 0
                
                daily_details = []
                while current <= end:
                    date_str = current.isoformat()
                    fte = fte_by_date.get(date_str, 0)
                    capacity_hours = fte * 8
                    total_capacity_hours += capacity_hours
                    
                    daily_details.append({
                        'date': date_str,
                        'hours_spent': 0,
                        'fte': fte,
                        'capacity_hours': round(capacity_hours, 2),
                        'utilization_percent': 0
                    })
                    
                    current += timedelta(days=1)
                
                verification_results.append({
                    'user_email': user_email,
                    'user_display_name': assignment.user_display_name,
                    'start_date': start_date,
                    'end_date': end_date,
                    'total_time_spent_hours': 0,
                    'total_capacity_hours': round(total_capacity_hours, 2),
                    'utilization_percent': 0,
                    'daily_details': daily_details
                })
    
    return jsonify({
        'start_date': start_date,
        'end_date': end_date,
        'project_key': project_key,
        'results': verification_results
    })


# ========== Existing Endpoints ==========

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
    """Pobiera wszystkich aktywnych użytkowników"""
    if not jira_client:
        return jsonify({'error': 'Jira nie jest skonfigurowane'}), 500
    
    users = jira_client.get_all_users()
    # Dodatkowe filtrowanie aktywnych (podwójna walidacja)
    active_users = [u for u in users if u.get('active', True) is True]
    return jsonify(active_users)


@app.route('/api/fte/cleanup-weekends', methods=['POST'])
def cleanup_weekend_assignments():
    """Usuwa wszystkie przypisania FTE na weekendy (sobota i niedziela)"""
    try:
        # Znajdź wszystkie przypisania na weekendy
        all_assignments = FTEAssignment.query.all()
        weekend_assignments = []
        
        for assignment in all_assignments:
            day_of_week = assignment.assignment_date.weekday()
            if day_of_week >= 5:  # Sobota (5) lub niedziela (6)
                weekend_assignments.append(assignment)
        
        # Usuń przypisania na weekendy
        for assignment in weekend_assignments:
            db.session.delete(assignment)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Usunięto {len(weekend_assignments)} przypisań na weekendy',
            'deleted_count': len(weekend_assignments)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/time/project/<project_key>', methods=['GET'])
def get_project_time(project_key: str):
    """Pobiera wykorzystanie czasu dla projektu"""
    if not tempo_client:
        return jsonify({'error': 'Tempo nie jest skonfigurowane'}), 500
    
    start_date = request.args.get('start_date', 
                                  (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
    
    worklogs = tempo_client.get_worklogs(
        project_key=project_key,
        start_date=start_date,
        end_date=end_date
    )
    
    user_time = {}
    total_time = 0
    
    for worklog in worklogs:
        user = worklog.get('author', {}).get('displayName', 'Unknown')
        time_spent = worklog.get('timeSpentSeconds', 0) / 3600
        
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


@app.route('/api/capacity', methods=['GET'])
def get_capacity():
    """Pobiera capacity dla wszystkich projektów"""
    if not jira_client or not tempo_client:
        return jsonify({'error': 'Jira lub Tempo nie jest skonfigurowane'}), 500
    
    start_date = request.args.get('start_date', 
                                  (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
    
    projects = jira_client.get_projects()
    project_time = tempo_client.get_time_per_project(start_date, end_date)
    
    capacity_data = []
    for project in projects:
        project_key = project.get('key')
        project_name = project.get('name', project_key)
        
        users = jira_client.get_project_users(project_key)
        hours_spent = project_time.get(project_key, 0)
        
        capacity_data.append({
            'key': project_key,
            'name': project_name,
            'user_count': len(users),
            'hours_spent': round(hours_spent, 2),
            'users': [{'displayName': u.get('displayName', u.get('name', 'Unknown'))} 
                     for u in users[:10]]
        })
    
    return jsonify({
        'start_date': start_date,
        'end_date': end_date,
        'projects': capacity_data
    })


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serwuje frontend React"""
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    static_folder = app.static_folder
    
    if not static_folder or not os.path.exists(static_folder):
        static_folder = FRONTEND_BUILD_PATH
    
    if static_folder and os.path.exists(static_folder):
        if path == '' or path.endswith('/'):
            index_path = os.path.join(static_folder, 'index.html')
            if os.path.exists(index_path):
                return send_from_directory(static_folder, 'index.html')
        
        file_path = os.path.join(static_folder, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(static_folder, path)
        
        index_path = os.path.join(static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder, 'index.html')
    
    return jsonify({
        'message': 'Frontend nie jest dostępny. Upewnij się, że został zbudowany.',
        'api_status': 'ok',
        'static_folder': static_folder,
        'exists': os.path.exists(static_folder) if static_folder else False,
        'current_dir': os.getcwd(),
        'base_dir': BASE_DIR
    }), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)

