import os
import sys
import random
from datetime import datetime, timedelta

# Add backend to path for imports (allows running from any directory)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
        
        # Mock categories and merchants (from test_data.csv)
        categories = {
            'Food & Dining': ['CHIPOTLE', 'POPEYES', 'KFC - UK STRIP MALL', 'SHAKE SHACK - WEEKEND', 'PIZZA HUT', 'POTBELLY', 'RAISING CANE\'S', 'WALMART SUPERCENTER STATION'],
            'Transportation': ['BOLTBUS', 'TAXI - USA', '7-ELEVEN', 'TURO STATION', 'AMERICAN AIRLINES', 'LYFT #5255 STORE', 'HERTZ STORE ONLINE'],
            'Entertainment & Recreation': ['SPOTIFY', 'HULU #4691 - EVENING', 'ARCADE', 'CONCERT TXN447568', 'CARNIVAL #4456', 'WATER PARK', 'CINEMA BRANCH', 'THEATER STORE'],
            'Shopping & Retail': ['ZARA #8639 STORE', 'NIKE', 'APPLE STORE', 'NEIMAN MARCUS', 'WALGREENS #2456', 'OFFICE DEPOT #3867', 'BIG LOTS', 'NORDSTROM'],
            'Utilities & Services': ['GAS COMPANY', 'PHONE COMPANY', 'SUDDENLINK #6615', 'WINDSTREAM', 'WIFI STORE', 'WATER COMPANY SHOPPING CENTER', 'MEDIACOM']
        }
        
        # Add recurring income (monthly salary deposits)
        print("Adding recurring income transactions...")
        base_salary_date = datetime.utcnow() - timedelta(days=90)
        for month_offset in range(3):
            date = base_salary_date + timedelta(days=month_offset * 30)
            income_tx = Transaction(
                user_id=demo_user.id,
                date=date,
                amount=20000.0,
                category='Income',
                merchant='Employer Ltd',
                description='Monthly Salary',
                transaction_type='salary',
                is_recurring=True,
                import_source='MockData'
            )
            db.session.add(income_tx)

        # Generate expense transactions for the last 30 days (negative amounts)
        print("Generating mock expense transactions...")
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
                amount=-amount,
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
