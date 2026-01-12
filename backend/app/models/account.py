from app.extensions import db
from datetime import datetime


class Account(db.Model):
    """
    Represents a financial account (checking, savings, credit card, etc.)
    Inferred from transaction import data.
    """
    __tablename__ = 'accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Account identification
    account_type = db.Column(db.String(50), nullable=False)  # checking, savings, credit_card
    account_name = db.Column(db.String(100), nullable=False)  # e.g., "Main Checking", "MAX Platinum"
    institution = db.Column(db.String(100))  # e.g., "Hapoalim (mock)", "MAX (mock)"
    card_last_4 = db.Column(db.String(4))  # Last 4 digits for cards
    
    # Account properties
    currency = db.Column(db.String(10), default='ILS')
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions = db.relationship('Transaction', backref='account', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_type': self.account_type,
            'account_name': self.account_name,
            'institution': self.institution,
            'card_last_4': self.card_last_4,
            'currency': self.currency,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Account {self.account_name} ({self.account_type})>'
