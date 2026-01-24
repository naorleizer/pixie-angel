from app.extensions import db
from datetime import datetime

class Challenge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(255))
    type = db.Column(db.String(50), default='spending_limit') # spending_limit, savings
    target_amount = db.Column(db.Float, nullable=False)
    current_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='active') # active, completed, failed, cancelled
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)
    color = db.Column(db.String(20), default='indigo') # indigo, emerald, rose, etc.

    # Soft-delete fields
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    deleted_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to updates
    updates = db.relationship('ChallengeUpdate', backref='challenge', lazy=True, cascade='all, delete-orphan')

    def compute_current_amount(self):
        """Compute current amount from sum of all updates"""
        total = sum(update.amount for update in self.updates)
        return total

    def compute_status(self):
        """Compute status based on end_date and current progress"""
        now = datetime.utcnow()
        if self.is_deleted:
            return 'cancelled'
        
        # Challenge is still active if end_date hasn't passed
        if self.end_date and now < self.end_date:
            return 'active'
        
        # After end_date, determine if completed or failed
        current = self.compute_current_amount()
        if current >= self.target_amount:
            return 'completed'
        else:
            return 'failed'

    def get_progress_status(self):
        """Get progress indicator (on_track/below_target) for active challenges"""
        current = self.compute_current_amount()
        if current >= self.target_amount:
            return 'on_track'
        elif current < 0:
            return 'below_target'
        else:
            # Calculate percentage progress
            progress = (current / self.target_amount) * 100 if self.target_amount > 0 else 0
            return 'on_track' if progress >= 50 else 'below_target'

    def to_dict(self, include_updates=False):
        current_amount = self.compute_current_amount()
        status = self.compute_status()
        
        result = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'type': self.type,
            'target_amount': self.target_amount,
            'current_amount': current_amount,
            'status': status,
            'progress_status': self.get_progress_status(),
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'color': self.color
        }
        # Include soft-delete metadata
        result['is_deleted'] = bool(self.is_deleted)
        result['deleted_at'] = self.deleted_at.isoformat() if self.deleted_at else None
        
        if include_updates:
            result['updates'] = [update.to_dict() for update in sorted(self.updates, key=lambda x: x.created_at, reverse=True)]
        
        return result


class ChallengeUpdate(db.Model):
    __tablename__ = 'challenge_updates'
    
    id = db.Column(db.Integer, primary_key=True)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenge.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)  # Signed: positive for savings, negative for spending
    description = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'challenge_id': self.challenge_id,
            'amount': self.amount,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
