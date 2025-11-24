"""Klient do komunikacji z Jira API"""
import requests
from typing import List, Dict, Optional
from datetime import datetime


class JiraClient:
    """Klient do komunikacji z Jira API"""
    
    def __init__(self, base_url: str, email: str, api_token: str):
        self.base_url = base_url.rstrip('/')
        self.email = email
        self.api_token = api_token
        self.auth = (email, api_token)
        self.api_url = f"{self.base_url}/rest/api/3"
    
    def get_projects(self) -> List[Dict]:
        """Pobiera listę wszystkich projektów"""
        try:
            response = requests.get(
                f"{self.api_url}/project",
                auth=self.auth,
                params={'expand': 'description,lead'},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Błąd podczas pobierania projektów: {e}")
            return []
    
    def get_project(self, project_key: str) -> Optional[Dict]:
        """Pobiera szczegóły projektu"""
        try:
            response = requests.get(
                f"{self.api_url}/project/{project_key}",
                auth=self.auth,
                params={'expand': 'description,lead'},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Błąd podczas pobierania projektu {project_key}: {e}")
            return None
    
    def get_project_users(self, project_key: str) -> List[Dict]:
        """Pobiera użytkowników przypisanych do projektu"""
        try:
            response = requests.get(
                f"{self.api_url}/project/{project_key}/role",
                auth=self.auth,
                timeout=30
            )
            response.raise_for_status()
            roles = response.json()
            
            users = []
            if 'Users' in roles:
                users_url = roles['Users']
                users_response = requests.get(users_url, auth=self.auth, timeout=30)
                users_response.raise_for_status()
                users_data = users_response.json()
                users = users_data.get('actors', [])
            
            return users
        except Exception as e:
            print(f"Błąd podczas pobierania użytkowników projektu {project_key}: {e}")
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
                        'active': True
                    },
                    timeout=30
                )
                response.raise_for_status()
                batch = response.json()
                
                if not batch:
                    break
                
                active_users = [u for u in batch if u.get('active', True)]
                users.extend(active_users)
                start_at += max_results
                
                if len(batch) < max_results:
                    break
            
            return users
        except Exception as e:
            print(f"Błąd podczas pobierania użytkowników: {e}")
            return []

