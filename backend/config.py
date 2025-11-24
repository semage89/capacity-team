"""Konfiguracja aplikacji"""
import os
from dotenv import load_dotenv

# Załaduj zmienne środowiskowe
load_dotenv()

class Config:
    """Konfiguracja aplikacji"""
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///team_capacity.db')
    if SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Jira Configuration
    JIRA_URL = os.getenv('JIRA_URL')
    JIRA_EMAIL = os.getenv('JIRA_EMAIL')
    JIRA_API_TOKEN = os.getenv('JIRA_API_TOKEN')
    
    # Tempo Configuration
    TEMPO_API_TOKEN = os.getenv('TEMPO_API_TOKEN')
    
    # Sync Configuration
    SYNC_INTERVAL_MINUTES = int(os.getenv('SYNC_INTERVAL_MINUTES', '60'))
    
    # Timezone
    DEFAULT_TIMEZONE = os.getenv('DEFAULT_TIMEZONE', 'Europe/Warsaw')

