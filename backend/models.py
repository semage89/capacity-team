from flask_sqlalchemy import SQLAlchemy
from datetime import date
from typing import Optional

db = SQLAlchemy()


class FTEAssignment(db.Model):
    """Model do przechowywania przypisań FTE użytkowników do projektów"""
    __tablename__ = 'fte_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(255), nullable=False, index=True)
    user_display_name = db.Column(db.String(255), nullable=False)
    project_key = db.Column(db.String(50), nullable=False, index=True)
    project_name = db.Column(db.String(255), nullable=False)
    assignment_date = db.Column(db.Date, nullable=False, index=True)
    fte_value = db.Column(db.Float, nullable=False)  # 0.0 - 1.0 (np. 0.5 = 50% FTE)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    
    # Unikalność: jeden użytkownik, jeden projekt, jedna data
    __table_args__ = (
        db.UniqueConstraint('user_email', 'project_key', 'assignment_date', name='unique_fte_assignment'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_email': self.user_email,
            'user_display_name': self.user_display_name,
            'project_key': self.project_key,
            'project_name': self.project_name,
            'assignment_date': self.assignment_date.isoformat(),
            'fte_value': self.fte_value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

