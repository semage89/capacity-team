"""Główna aplikacja Flask"""
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from datetime import datetime, date, timedelta
from typing import Optional
import os

from .config import Config
from .models import db, Project, User, ResourceAllocation, Absence, SyncLog
from .jira_client import JiraClient
from .tempo_client import TempoClient
from .sync_service import SyncService
from .export_service import ExportService

app = Flask(__name__, static_folder=None)
app.config.from_object(Config)
CORS(app)

# Inicjalizacja bazy danych
db.init_app(app)

# Inicjalizacja klientów
jira_client = None
tempo_client = None
sync_service = None

def init_clients():
    """Inicjalizuje klienty Jira i Tempo"""
    global jira_client, tempo_client, sync_service
    
    if Config.JIRA_URL and Config.JIRA_EMAIL and Config.JIRA_API_TOKEN:
        jira_client = JiraClient(Config.JIRA_URL, Config.JIRA_EMAIL, Config.JIRA_API_TOKEN)
    
    if Config.JIRA_URL and Config.TEMPO_API_TOKEN:
        tempo_client = TempoClient(Config.JIRA_URL, Config.TEMPO_API_TOKEN)
    
    if jira_client:
        sync_service = SyncService(jira_client, tempo_client)
    
    print(f"✓ Klienci zainicjalizowani: Jira={jira_client is not None}, Tempo={tempo_client is not None}")

# Inicjalizuj klientów przy starcie
with app.app_context():
    db.create_all()
    init_clients()


# ========== Health Check ==========

@app.route('/api/health', methods=['GET'])
def health():
    """Sprawdza status API"""
    return jsonify({
        'status': 'ok',
        'jira_configured': jira_client is not None,
        'tempo_configured': tempo_client is not None
    })


# ========== Synchronizacja ==========

@app.route('/api/sync/projects', methods=['POST'])
def sync_projects():
    """Synchronizuje projekty z Jiry"""
    if not sync_service:
        return jsonify({'error': 'Jira nie jest skonfigurowane'}), 500
    
    result = sync_service.sync_projects()
    return jsonify(result), 200 if result.get('status') == 'success' else 500


@app.route('/api/sync/users', methods=['POST'])
def sync_users():
    """Synchronizuje użytkowników z Jiry"""
    if not sync_service:
        return jsonify({'error': 'Jira nie jest skonfigurowane'}), 500
    
    result = sync_service.sync_users()
    return jsonify(result), 200 if result.get('status') == 'success' else 500


@app.route('/api/sync/all', methods=['POST'])
def sync_all():
    """Synchronizuje wszystkie dane"""
    if not sync_service:
        return jsonify({'error': 'Jira nie jest skonfigurowane'}), 500
    
    result = sync_service.sync_all()
    return jsonify(result), 200


@app.route('/api/sync/logs', methods=['GET'])
def get_sync_logs():
    """Pobiera logi synchronizacji"""
    limit = request.args.get('limit', 50, type=int)
    logs = SyncLog.query.order_by(SyncLog.started_at.desc()).limit(limit).all()
    return jsonify([log.to_dict() for log in logs])


# ========== Projekty ==========

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Pobiera listę projektów"""
    active_only = request.args.get('active_only', 'true').lower() == 'true'
    query = Project.query
    
    if active_only:
        query = query.filter_by(is_active=True)
    
    projects = query.order_by(Project.name).all()
    return jsonify([p.to_dict() for p in projects])


@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Pobiera szczegóły projektu"""
    project = Project.query.get_or_404(project_id)
    return jsonify(project.to_dict())


# ========== Użytkownicy ==========

@app.route('/api/users', methods=['GET'])
def get_users():
    """Pobiera listę użytkowników"""
    active_only = request.args.get('active_only', 'true').lower() == 'true'
    query = User.query
    
    if active_only:
        query = query.filter_by(is_active=True)
    
    users = query.order_by(User.display_name).all()
    return jsonify([u.to_dict() for u in users])


@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Pobiera szczegóły użytkownika"""
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Aktualizuje użytkownika"""
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if 'timezone' in data:
        user.timezone = data['timezone']
    if 'work_hours_per_day' in data:
        user.work_hours_per_day = float(data['work_hours_per_day'])
    
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(user.to_dict())


# ========== Alokacje zasobów ==========

@app.route('/api/allocations', methods=['GET'])
def get_allocations():
    """Pobiera alokacje zasobów"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    user_id = request.args.get('user_id', type=int)
    project_id = request.args.get('project_id', type=int)
    
    query = ResourceAllocation.query
    
    if start_date:
        query = query.filter(ResourceAllocation.start_date >= datetime.fromisoformat(start_date).date())
    if end_date:
        query = query.filter(
            (ResourceAllocation.end_date == None) |
            (ResourceAllocation.end_date <= datetime.fromisoformat(end_date).date())
        )
    if user_id:
        query = query.filter_by(user_id=user_id)
    if project_id:
        query = query.filter_by(project_id=project_id)
    
    allocations = query.order_by(ResourceAllocation.start_date).all()
    return jsonify([a.to_dict() for a in allocations])


@app.route('/api/allocations', methods=['POST'])
def create_allocation():
    """Tworzy nową alokację"""
    data = request.json
    
    required_fields = ['user_id', 'project_id', 'start_date', 'allocation_percentage']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Brakuje pola: {field}'}), 400
    
    allocation = ResourceAllocation(
        user_id=data['user_id'],
        project_id=data['project_id'],
        role=data.get('role'),
        start_date=datetime.fromisoformat(data['start_date']).date(),
        end_date=datetime.fromisoformat(data['end_date']).date() if data.get('end_date') else None,
        allocation_percentage=float(data['allocation_percentage']),
        notes=data.get('notes')
    )
    
    db.session.add(allocation)
    db.session.commit()
    
    return jsonify(allocation.to_dict()), 201


@app.route('/api/allocations/<int:allocation_id>', methods=['PUT'])
def update_allocation(allocation_id):
    """Aktualizuje alokację"""
    allocation = ResourceAllocation.query.get_or_404(allocation_id)
    data = request.json
    
    if 'role' in data:
        allocation.role = data['role']
    if 'start_date' in data:
        allocation.start_date = datetime.fromisoformat(data['start_date']).date()
    if 'end_date' in data:
        allocation.end_date = datetime.fromisoformat(data['end_date']).date() if data.get('end_date') else None
    if 'allocation_percentage' in data:
        allocation.allocation_percentage = float(data['allocation_percentage'])
    if 'notes' in data:
        allocation.notes = data['notes']
    
    allocation.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(allocation.to_dict())


@app.route('/api/allocations/<int:allocation_id>', methods=['DELETE'])
def delete_allocation(allocation_id):
    """Usuwa alokację"""
    allocation = ResourceAllocation.query.get_or_404(allocation_id)
    db.session.delete(allocation)
    db.session.commit()
    
    return jsonify({'message': 'Alokacja została usunięta'}), 200


# ========== Nieobecności ==========

@app.route('/api/absences', methods=['GET'])
def get_absences():
    """Pobiera nieobecności"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    user_id = request.args.get('user_id', type=int)
    
    query = Absence.query
    
    if start_date:
        query = query.filter(Absence.start_date >= datetime.fromisoformat(start_date).date())
    if end_date:
        query = query.filter(Absence.end_date <= datetime.fromisoformat(end_date).date())
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    absences = query.order_by(Absence.start_date).all()
    return jsonify([a.to_dict() for a in absences])


@app.route('/api/absences', methods=['POST'])
def create_absence():
    """Tworzy nową nieobecność"""
    data = request.json
    
    required_fields = ['user_id', 'absence_type', 'start_date', 'end_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Brakuje pola: {field}'}), 400
    
    absence = Absence(
        user_id=data['user_id'],
        absence_type=data['absence_type'],
        start_date=datetime.fromisoformat(data['start_date']).date(),
        end_date=datetime.fromisoformat(data['end_date']).date(),
        description=data.get('description'),
        is_approved=data.get('is_approved', False)
    )
    
    db.session.add(absence)
    db.session.commit()
    
    return jsonify(absence.to_dict()), 201


@app.route('/api/absences/<int:absence_id>', methods=['PUT'])
def update_absence(absence_id):
    """Aktualizuje nieobecność"""
    absence = Absence.query.get_or_404(absence_id)
    data = request.json
    
    if 'absence_type' in data:
        absence.absence_type = data['absence_type']
    if 'start_date' in data:
        absence.start_date = datetime.fromisoformat(data['start_date']).date()
    if 'end_date' in data:
        absence.end_date = datetime.fromisoformat(data['end_date']).date()
    if 'description' in data:
        absence.description = data['description']
    if 'is_approved' in data:
        absence.is_approved = data['is_approved']
    
    absence.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(absence.to_dict())


@app.route('/api/absences/<int:absence_id>', methods=['DELETE'])
def delete_absence(absence_id):
    """Usuwa nieobecność"""
    absence = Absence.query.get_or_404(absence_id)
    db.session.delete(absence)
    db.session.commit()
    
    return jsonify({'message': 'Nieobecność została usunięta'}), 200


# ========== Kalendarz i analityka ==========

@app.route('/api/calendar', methods=['GET'])
def get_calendar():
    """Pobiera dane kalendarza dla okresu"""
    start_date = request.args.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'))
    
    start = datetime.fromisoformat(start_date).date()
    end = datetime.fromisoformat(end_date).date()
    
    # Pobierz alokacje
    allocations = ResourceAllocation.query.filter(
        ResourceAllocation.start_date <= end,
        (ResourceAllocation.end_date == None) | (ResourceAllocation.end_date >= start)
    ).all()
    
    # Pobierz nieobecności
    absences = Absence.query.filter(
        Absence.start_date <= end,
        Absence.end_date >= start
    ).all()
    
    # Grupuj dane po datach
    calendar_data = {}
    current = start
    while current <= end:
        date_str = current.isoformat()
        calendar_data[date_str] = {
            'date': date_str,
            'allocations': [],
            'absences': []
        }
        current += timedelta(days=1)
    
    # Dodaj alokacje
    for allocation in allocations:
        alloc_start = max(allocation.start_date, start)
        alloc_end = min(allocation.end_date, end) if allocation.end_date else end
        
        current = alloc_start
        while current <= alloc_end:
            date_str = current.isoformat()
            if date_str in calendar_data:
                calendar_data[date_str]['allocations'].append(allocation.to_dict())
            current += timedelta(days=1)
    
    # Dodaj nieobecności
    for absence in absences:
        current = max(absence.start_date, start)
        while current <= min(absence.end_date, end):
            date_str = current.isoformat()
            if date_str in calendar_data:
                calendar_data[date_str]['absences'].append(absence.to_dict())
            current += timedelta(days=1)
    
    return jsonify({
        'start_date': start_date,
        'end_date': end_date,
        'calendar': list(calendar_data.values())
    })


@app.route('/api/analytics/overload', methods=['GET'])
def get_overload_analysis():
    """Analizuje przeciążenia zasobów"""
    start_date = request.args.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'))
    
    start = datetime.fromisoformat(start_date).date()
    end = datetime.fromisoformat(end_date).date()
    
    # Pobierz alokacje
    allocations = ResourceAllocation.query.filter(
        ResourceAllocation.start_date <= end,
        (ResourceAllocation.end_date == None) | (ResourceAllocation.end_date >= start)
    ).all()
    
    # Grupuj po użytkownikach i datach
    user_days = {}
    current = start
    while current <= end:
        for allocation in allocations:
            if allocation.start_date <= current <= (allocation.end_date or end):
                user_id = allocation.user_id
                date_str = current.isoformat()
                key = f"{user_id}_{date_str}"
                
                if key not in user_days:
                    user_days[key] = {
                        'user_id': user_id,
                        'user': allocation.user.to_dict() if allocation.user else None,
                        'date': date_str,
                        'total_allocation': 0,
                        'allocations': []
                    }
                
                user_days[key]['total_allocation'] += allocation.allocation_percentage
                user_days[key]['allocations'].append(allocation.to_dict())
        
        current += timedelta(days=1)
    
    # Wykryj przeciążenia (>100%) i niedobory (<80%)
    overloaded = []
    underutilized = []
    
    for key, day_data in user_days.items():
        total = day_data['total_allocation']
        if total > 100:
            overloaded.append({
                **day_data,
                'overload_percentage': total - 100,
                'suggestion': f"Zmniejsz alokację o {total - 100:.1f}%"
            })
        elif total < 80:
            underutilized.append({
                **day_data,
                'available_capacity': 100 - total,
                'suggestion': f"Dostępna pojemność: {100 - total:.1f}%"
            })
    
    return jsonify({
        'start_date': start_date,
        'end_date': end_date,
        'overloaded': overloaded,
        'underutilized': underutilized,
        'summary': {
            'total_overloaded_days': len(overloaded),
            'total_underutilized_days': len(underutilized)
        }
    })


# ========== Eksport ==========

@app.route('/api/export/allocations/excel', methods=['GET'])
def export_allocations_excel():
    """Eksportuje alokacje do Excel"""
    start_date = request.args.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'))
    
    start = datetime.fromisoformat(start_date).date()
    end = datetime.fromisoformat(end_date).date()
    
    allocations = ResourceAllocation.query.filter(
        ResourceAllocation.start_date <= end,
        (ResourceAllocation.end_date == None) | (ResourceAllocation.end_date >= start)
    ).all()
    
    excel_file = ExportService.export_allocations_excel(allocations, start, end)
    
    return Response(
        excel_file,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename=allocations_{start_date}_{end_date}.xlsx'}
    )


@app.route('/api/export/allocations/pdf', methods=['GET'])
def export_allocations_pdf():
    """Eksportuje alokacje do PDF"""
    start_date = request.args.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'))
    
    start = datetime.fromisoformat(start_date).date()
    end = datetime.fromisoformat(end_date).date()
    
    allocations = ResourceAllocation.query.filter(
        ResourceAllocation.start_date <= end,
        (ResourceAllocation.end_date == None) | (ResourceAllocation.end_date >= start)
    ).all()
    
    pdf_file = ExportService.export_allocations_pdf(allocations, start, end)
    
    return Response(
        pdf_file,
        mimetype='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=allocations_{start_date}_{end_date}.pdf'}
    )


if __name__ == '__main__':
    # Uruchom scheduler jeśli jest skonfigurowany
    try:
        from .scheduler import init_scheduler
        scheduler = init_scheduler()
    except Exception as e:
        print(f"Nie udało się uruchomić schedulera: {e}")
    
    app.run(debug=True, port=5000)
