"""Serwis synchronizacji danych z Jira i Tempo"""
from datetime import datetime
from typing import Dict, List
from .models import db, Project, User, SyncLog
from .jira_client import JiraClient
from .tempo_client import TempoClient


class SyncService:
    """Serwis do synchronizacji danych z Jira i Tempo"""
    
    def __init__(self, jira_client: JiraClient, tempo_client: TempoClient = None):
        self.jira_client = jira_client
        self.tempo_client = tempo_client
    
    def sync_projects(self) -> Dict:
        """Synchronizuje projekty z Jiry"""
        log = SyncLog(
            sync_type='jira_projects',
            status='running',
            started_at=datetime.utcnow()
        )
        db.session.add(log)
        db.session.flush()
        
        try:
            jira_projects = self.jira_client.get_projects()
            created = 0
            updated = 0
            
            for jira_project in jira_projects:
                project_key = jira_project.get('key')
                if not project_key:
                    continue
                
                project = Project.query.filter_by(jira_key=project_key).first()
                
                if project:
                    # Aktualizuj istniejący projekt
                    project.name = jira_project.get('name', project.name)
                    project.description = jira_project.get('description', project.description)
                    project.project_type = jira_project.get('projectTypeKey', project.project_type)
                    project.lead_email = jira_project.get('lead', {}).get('emailAddress', project.lead_email)
                    project.avatar_url = jira_project.get('avatarUrls', {}).get('48x48', project.avatar_url)
                    project.is_active = True
                    project.last_synced = datetime.utcnow()
                    project.updated_at = datetime.utcnow()
                    updated += 1
                else:
                    # Utwórz nowy projekt
                    project = Project(
                        jira_key=project_key,
                        name=jira_project.get('name', ''),
                        description=jira_project.get('description', ''),
                        project_type=jira_project.get('projectTypeKey'),
                        lead_email=jira_project.get('lead', {}).get('emailAddress'),
                        avatar_url=jira_project.get('avatarUrls', {}).get('48x48'),
                        is_active=True,
                        last_synced=datetime.utcnow()
                    )
                    db.session.add(project)
                    created += 1
            
            log.status = 'success'
            log.records_processed = len(jira_projects)
            log.records_created = created
            log.records_updated = updated
            log.completed_at = datetime.utcnow()
            
            db.session.commit()
            return {'status': 'success', 'created': created, 'updated': updated, 'total': len(jira_projects)}
            
        except Exception as e:
            log.status = 'error'
            log.error_message = str(e)
            log.completed_at = datetime.utcnow()
            db.session.commit()
            return {'status': 'error', 'error': str(e)}
    
    def sync_users(self) -> Dict:
        """Synchronizuje użytkowników z Jiry"""
        log = SyncLog(
            sync_type='jira_users',
            status='running',
            started_at=datetime.utcnow()
        )
        db.session.add(log)
        db.session.flush()
        
        try:
            jira_users = self.jira_client.get_all_users()
            created = 0
            updated = 0
            
            for jira_user in jira_users:
                account_id = jira_user.get('accountId')
                if not account_id:
                    continue
                
                user = User.query.filter_by(jira_account_id=account_id).first()
                
                if user:
                    # Aktualizuj istniejącego użytkownika
                    user.email = jira_user.get('emailAddress', user.email)
                    user.display_name = jira_user.get('displayName', user.display_name)
                    user.avatar_url = jira_user.get('avatarUrls', {}).get('48x48', user.avatar_url)
                    user.is_active = jira_user.get('active', True)
                    user.last_synced = datetime.utcnow()
                    user.updated_at = datetime.utcnow()
                    updated += 1
                else:
                    # Utwórz nowego użytkownika
                    user = User(
                        jira_account_id=account_id,
                        email=jira_user.get('emailAddress', ''),
                        display_name=jira_user.get('displayName', ''),
                        avatar_url=jira_user.get('avatarUrls', {}).get('48x48'),
                        is_active=jira_user.get('active', True),
                        last_synced=datetime.utcnow()
                    )
                    db.session.add(user)
                    created += 1
            
            log.status = 'success'
            log.records_processed = len(jira_users)
            log.records_created = created
            log.records_updated = updated
            log.completed_at = datetime.utcnow()
            
            db.session.commit()
            return {'status': 'success', 'created': created, 'updated': updated, 'total': len(jira_users)}
            
        except Exception as e:
            log.status = 'error'
            log.error_message = str(e)
            log.completed_at = datetime.utcnow()
            db.session.commit()
            return {'status': 'error', 'error': str(e)}
    
    def sync_all(self) -> Dict:
        """Synchronizuje wszystkie dane"""
        results = {
            'projects': self.sync_projects(),
            'users': self.sync_users()
        }
        return results

