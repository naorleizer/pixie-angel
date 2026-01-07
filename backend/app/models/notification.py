from app.extensions import db
from datetime import datetime

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    message = db.Column(db.String(255))
    type = db.Column(db.String(20), default='info') # info, warning, success, alert
    is_read = db.Column(db.Boolean, default=False)
    action_link = db.Column(db.String(120)) # Optional: screen link or action id
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'action_link': self.action_link,
            'created_at': self.created_at.isoformat()
        }
