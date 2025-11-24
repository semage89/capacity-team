"""Modele danych"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from typing import Optional

db = SQLAlchemy()


class Project(db.Model):
    """Model projektu z Jiry"""
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    jira_key = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    project_type = db.Column(db.String(50))
    lead_email = db.Column(db.String(255))
    avatar_url = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    last_synced = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacje
    allocations = db.relationship('ResourceAllocation', back_populates='project', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'jira_key': self.jira_key,
            'name': self.name,
            'description': self.description,
            'project_type': self.project_type,
            'lead_email': self.lead_email,
            'avatar_url': self.avatar_url,
            'is_active': self.is_active,
            'last_synced': self.last_synced.isoformat() if self.last_synced else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class User(db.Model):
    """Model użytkownika z Jiry"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    jira_account_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    display_name = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.String(500))
    timezone = db.Column(db.String(50), default='Europe/Warsaw')
    work_hours_per_day = db.Column(db.Float, default=8.0)
    is_active = db.Column(db.Boolean, default=True)
    last_synced = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacje
    allocations = db.relationship('ResourceAllocation', back_populates='user', cascade='all, delete-orphan')
    absences = db.relationship('Absence', back_populates='user', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'jira_account_id': self.jira_account_id,
            'email': self.email,
            'display_name': self.display_name,
            'avatar_url': self.avatar_url,
            'timezone': self.timezone,
            'work_hours_per_day': self.work_hours_per_day,
            'is_active': self.is_active,
            'last_synced': self.last_synced.isoformat() if self.last_synced else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ResourceAllocation(db.Model):
    """Model alokacji zasobów (przypisanie użytkownika do projektu)"""
    __tablename__ = 'resource_allocations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False, index=True)
    role = db.Column(db.String(100))  # np. Developer, Tester, PM
    start_date = db.Column(db.Date, nullable=False, index=True)
    end_date = db.Column(db.Date, index=True)  # None = bezterminowo
    allocation_percentage = db.Column(db.Float, default=100.0)  # 0-100%
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacje
    user = db.relationship('User', back_populates='allocations')
    project = db.relationship('Project', back_populates='allocations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'project_id': self.project_id,
            'project': self.project.to_dict() if self.project else None,
            'role': self.role,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'allocation_percentage': self.allocation_percentage,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Absence(db.Model):
    """Model nieobecności (urlopy, dni wolne)"""
    __tablename__ = 'absences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    absence_type = db.Column(db.String(50), nullable=False)  # vacation, sick_leave, holiday, other
    start_date = db.Column(db.Date, nullable=False, index=True)
    end_date = db.Column(db.Date, nullable=False, index=True)
    description = db.Column(db.Text)
    is_approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacje
    user = db.relationship('User', back_populates='absences')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'absence_type': self.absence_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'description': self.description,
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class SyncLog(db.Model):
    """Model logów synchronizacji"""
    __tablename__ = 'sync_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    sync_type = db.Column(db.String(50), nullable=False)  # jira_projects, jira_users, tempo_worklogs
    status = db.Column(db.String(50), nullable=False)  # success, error, partial
    records_processed = db.Column(db.Integer, default=0)
    records_created = db.Column(db.Integer, default=0)
    records_updated = db.Column(db.Integer, default=0)
    error_message = db.Column(db.Text)
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sync_type': self.sync_type,
            'status': self.status,
            'records_processed': self.records_processed,
            'records_created': self.records_created,
            'records_updated': self.records_updated,
            'error_message': self.error_message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
