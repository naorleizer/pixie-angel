from app.extensions import db
from datetime import datetime


class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True)  # Link to account
    
    # Core transaction data
    date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='ILS')
    description = db.Column(db.String(255))  # What user sees on bank statement
    balance_after = db.Column(db.Float, nullable=True)  # Balance after transaction
    
    # Transaction classification
    transaction_type = db.Column(db.String(50))  # salary, card_purchase, bill_payment, transfer, etc.
    category = db.Column(db.String(50), index=True)  # e.g., 'Food', 'Transport', 'Entertainment'
    categorization_confidence = db.Column(db.Float, default=0.0)  # 0.0-1.0 confidence score
    categorization_source = db.Column(db.String(20), default='manual')  # heuristic, ml, llm, manual
    
    # Merchant information
    merchant = db.Column(db.String(100))  # Merchant name
    merchant_country = db.Column(db.String(2))  # ISO country code (e.g., 'IL', 'US')
    merchant_city = db.Column(db.String(100))
    merchant_state = db.Column(db.String(50))
    merchant_zip = db.Column(db.String(20))
    mcc = db.Column(db.String(10))  # Merchant Category Code
    
    # Transaction metadata
    is_recurring = db.Column(db.Boolean, default=False)  # Monthly recurring transaction
    use_chip = db.Column(db.String(50))  # Chip/Swipe/Online Transaction (legacy)
    is_fraud = db.Column(db.Boolean, default=False)
    is_essential = db.Column(db.Boolean, default=True)  # Useful for LLM analysis
    
    # Import tracking
    import_source = db.Column(db.String(50))  # e.g., 'CSV Upload', 'Manual'
    external_id = db.Column(db.String(100))  # ID from the bank statement to prevent duplicates
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'amount': self.amount,
            'currency': self.currency,
            'description': self.description,
            'balance_after': self.balance_after,
            'transaction_type': self.transaction_type,
            'category': self.category,
            'categorization_confidence': self.categorization_confidence,
            'categorization_source': self.categorization_source,
            'merchant': self.merchant,
            'merchant_country': self.merchant_country,
            'merchant_city': self.merchant_city,
            'merchant_state': self.merchant_state,
            'mcc': self.mcc,
            'is_recurring': self.is_recurring,
            'is_essential': self.is_essential,
            'account_id': self.account_id
        }
