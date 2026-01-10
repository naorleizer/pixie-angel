from app import create_app, db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.chat import ChatSession, ChatMessage
from app.models.challenge import Challenge
from app.models.notification import Notification

app = create_app()

with app.app_context():
    print("Clearing all data from database...")
    
    # Delete in order of dependencies (child tables first)
    # db.session.query(ChatMessage).delete()
    # db.session.query(ChatSession).delete()
    db.session.query(Transaction).delete()
    # db.session.query(Challenge).delete()
    # db.session.query(Notification).delete()
    # db.session.query(User).delete()
    
    db.session.commit()
    print("Database cleared!")
