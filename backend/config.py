"""Konfiguracja aplikacji"""
import os
from dotenv import load_dotenv

# Załaduj zmienne środowiskowe
load_dotenv()

class Config:
    """Konfiguracja aplikacji"""
    # Database
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///team_capacity.db')
    
    # Popraw format postgres:// na postgresql://
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,  # Sprawdza połączenie przed użyciem
        'pool_recycle': 300,    # Recykling połączeń co 5 minut
    }
    
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

