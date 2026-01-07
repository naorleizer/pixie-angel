from app.extensions import db
from datetime import datetime

class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='ILS')
    
    category = db.Column(db.String(50), index=True) # e.g., 'Food', 'Transport', 'Entertainment'
    description = db.Column(db.String(255))
    merchant = db.Column(db.String(100))
    
    # Additional fields from CSV imports
    merchant_city = db.Column(db.String(100))
    merchant_state = db.Column(db.String(50))
    merchant_zip = db.Column(db.String(20))
    mcc = db.Column(db.String(10))  # Merchant Category Code
    use_chip = db.Column(db.String(50))  # Chip/Swipe/Online Transaction
    is_fraud = db.Column(db.Boolean, default=False)
    
    # For CSV/Excel imports
    import_source = db.Column(db.String(50)) # e.g., 'Bank_X_CSV', 'Manual'
    external_id = db.Column(db.String(100)) # ID from the bank statement to prevent duplicates
    
    is_essential = db.Column(db.Boolean, default=True) # Useful for LLM analysis
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'amount': self.amount,
            'currency': self.currency,
            'category': self.category,
            'description': self.description,
            'merchant': self.merchant,
            'merchant_city': self.merchant_city,
            'merchant_state': self.merchant_state,
            'mcc': self.mcc,
            'is_essential': self.is_essential
        }
