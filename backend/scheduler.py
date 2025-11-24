"""Automatyczne zadania synchronizacji"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from .app import app
from .config import Config
from .sync_service import SyncService
from .jira_client import JiraClient
from .tempo_client import TempoClient


def init_scheduler():
    """Inicjalizuje scheduler do automatycznych synchronizacji"""
    scheduler = BackgroundScheduler()
    
    def sync_job():
        """Zadanie synchronizacji"""
        with app.app_context():
            if Config.JIRA_URL and Config.JIRA_EMAIL and Config.JIRA_API_TOKEN:
                jira_client = JiraClient(Config.JIRA_URL, Config.JIRA_EMAIL, Config.JIRA_API_TOKEN)
                tempo_client = None
                if Config.TEMPO_API_TOKEN:
                    tempo_client = TempoClient(Config.JIRA_URL, Config.TEMPO_API_TOKEN)
                
                sync_service = SyncService(jira_client, tempo_client)
                print(f"[{datetime.now()}] Rozpoczynam automatyczną synchronizację...")
                sync_service.sync_all()
                print(f"[{datetime.now()}] Synchronizacja zakończona")
    
    # Dodaj zadanie synchronizacji
    scheduler.add_job(
        sync_job,
        trigger=IntervalTrigger(minutes=Config.SYNC_INTERVAL_MINUTES),
        id='sync_jira_tempo',
        name='Synchronizacja Jira i Tempo',
        replace_existing=True
    )
    
    scheduler.start()
    print(f"✓ Scheduler uruchomiony - synchronizacja co {Config.SYNC_INTERVAL_MINUTES} minut")
    return scheduler

