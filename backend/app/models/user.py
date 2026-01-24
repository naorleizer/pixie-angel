from app.extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    preferred_persona = db.Column(db.String(50), default='the_supportive')
    interests = db.Column(db.JSON, default=list)
    motivations = db.Column(db.JSON, default=list)
    location_enabled = db.Column(db.Boolean, default=False)
    interests_and_motivation_enabled = db.Column(db.Boolean, default=False)
    communication_style = db.Column(db.Boolean, default=False)
    has_completed_persona_quiz = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    transactions = db.relationship('Transaction', backref='user', lazy='dynamic')
    chat_sessions = db.relationship('ChatSession', backref='user', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'preferred_persona': self.preferred_persona,
            'interests': self.interests or [],
            'motivations': self.motivations or [],
            'location_enabled': bool(self.location_enabled),
            'interests_and_motivation_enabled': bool(self.interests_and_motivation_enabled),
            'communication_style': bool(self.communication_style),
            'has_completed_persona_quiz': self.has_completed_persona_quiz,
            'created_at': self.created_at.isoformat()
        }

