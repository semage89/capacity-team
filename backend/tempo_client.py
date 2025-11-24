"""Klient do komunikacji z Tempo API"""
import requests
from typing import List, Dict, Optional
from datetime import datetime, date


class TempoClient:
    """Klient do komunikacji z Tempo API"""
    
    def __init__(self, base_url: str, api_token: str):
        self.base_url = base_url.rstrip('/')
        self.api_token = api_token
        self.headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        }
        # Różne możliwe endpointy Tempo API
        self.api_urls = [
            f"{self.base_url}/rest/tempo-timesheets/4",
            f"{self.base_url}/rest/tempo-timesheets/3",
            f"{self.base_url}/rest/tempo-core/1"
        ]
    
    def get_worklogs(self, start_date: Optional[str] = None,
                     end_date: Optional[str] = None,
                     project_key: Optional[str] = None,
                     user_account_id: Optional[str] = None) -> List[Dict]:
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
                if user_account_id:
                    params['accountId'] = user_account_id
                
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
                            timeout=30
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
    
    def get_planner_data(self, start_date: Optional[str] = None,
                         end_date: Optional[str] = None) -> List[Dict]:
        """Pobiera dane z Tempo Planner (planowane zadania)"""
        try:
            # Tempo Planner API może być dostępne pod różnymi endpointami
            endpoints = [
                f"{self.base_url}/rest/tempo-planning/1/plan",
                f"{self.base_url}/rest/tempo-core/1/plan",
            ]
            
            params = {}
            if start_date:
                params['from'] = start_date
            if end_date:
                params['to'] = end_date
            
            for endpoint in endpoints:
                try:
                    response = requests.get(
                        endpoint,
                        headers=self.headers,
                        params=params,
                        timeout=30
                    )
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, list):
                            return data
                        elif isinstance(data, dict) and 'results' in data:
                            return data['results']
                        return data if isinstance(data, list) else []
                except requests.exceptions.RequestException:
                    continue
        except Exception as e:
            print(f"Błąd podczas pobierania danych z Tempo Planner: {e}")
        
        return []
    
    def get_team_members(self, team_id: Optional[str] = None) -> List[Dict]:
        """Pobiera członków zespołu z Tempo"""
        try:
            endpoints = [
                f"{self.base_url}/rest/tempo-teams/2/team/{team_id}/member" if team_id else None,
                f"{self.base_url}/rest/tempo-core/1/team/{team_id}/member" if team_id else None,
            ]
            
            for endpoint in endpoints:
                if not endpoint:
                    continue
                try:
                    response = requests.get(
                        endpoint,
                        headers=self.headers,
                        timeout=30
                    )
                    if response.status_code == 200:
                        data = response.json()
                        if isinstance(data, list):
                            return data
                        elif isinstance(data, dict) and 'results' in data:
                            return data['results']
                        return data if isinstance(data, list) else []
                except requests.exceptions.RequestException:
                    continue
        except Exception as e:
            print(f"Błąd podczas pobierania członków zespołu: {e}")
        
        return []

