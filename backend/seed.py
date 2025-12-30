import os
import random
from datetime import datetime, timedelta
from app import create_app, db
from app.models.user import User
from app.models.transaction import Transaction

def seed_data():
    app = create_app()
    with app.app_context():
        print("Starting database seeding...")
        
        # Create a demo user if it doesn't exist
        demo_user = User.query.filter_by(username='demo_user').first()
        if not demo_user:
            print("Creating demo user...")
            demo_password = os.getenv("PIXIE_DEMO_PASSWORD")
            if not demo_password:
                raise RuntimeError(
                    "Environment variable PIXIE_DEMO_PASSWORD must be set before seeding demo data."
                )
            demo_user = User(username='demo_user', email='demo@pixie.ai')
            demo_user.set_password(demo_password)
            db.session.add(demo_user)
            db.session.commit()
        
        # Clear existing transactions for demo user
        Transaction.query.filter_by(user_id=demo_user.id).delete()
        
        # Mock categories and merchants
        categories = {
            'Food': ['Supermarket', 'Restaurant', 'Coffee Shop', 'Bakery'],
            'Transport': ['Gas Station', 'Bus', 'Train', 'Uber'],
            'Entertainment': ['Cinema', 'Netflix', 'Spotify', 'Bowling'],
            'Shopping': ['Amazon', 'Zara', 'H&M', 'IKEA'],
            'Utilities': ['Electric Bill', 'Water Bill', 'Internet', 'Phone']
        }
        
        # Generate transactions for the last 30 days
        print("Generating mock transactions...")
        for i in range(60): # 60 transactions
            days_ago = random.randint(0, 30)
            date = datetime.utcnow() - timedelta(days=days_ago)
            
            category = random.choice(list(categories.keys()))
            merchant = random.choice(categories[category])
            amount = round(random.uniform(10.0, 500.0), 2)
            
            is_essential = category in ['Utilities', 'Transport'] or (category == 'Food' and merchant == 'Supermarket')
            
            tx = Transaction(
                user_id=demo_user.id,
                date=date,
                amount=amount,
                category=category,
                merchant=merchant,
                description=f"Purchase at {merchant}",
                is_essential=is_essential,
                import_source='MockData'
            )
            db.session.add(tx)
            
        db.session.commit()
        print(f"Successfully seeded 60 transactions for user: {demo_user.username}")

if __name__ == '__main__':
    seed_data()
