import os
import sys

# Add backend to path for imports (allows running from any directory)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.chat import ChatSession, ChatMessage
from app.models.challenge import Challenge, ChallengeUpdate
from app.models.notification import Notification
from app.models.feedback import Feedback

app = create_app()

with app.app_context():
    # print("Clearing all data from database...")
    
    # Delete in order of dependencies (child tables first)
    # db.session.query(ChatMessage).delete()
    # db.session.query(ChatSession).delete()
    # db.session.query(Transaction).delete()
    # db.session.query(Challenge).delete()
    # db.session.query(Notification).delete()
    # db.session.query(User).delete()
    
    # db.session.commit()
    # print("Database cleared!")
    print("Dropping all tables...")
    db.drop_all()
    
    print("Creating all tables...")
    db.create_all()
    
    print("Database cleared and recreated successfully!")
    print("All tables created from current models.")
