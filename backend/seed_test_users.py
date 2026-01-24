"""
Seed script for creating dedicated LLM test users with synthetic transaction data.
Creates three test users with specific spending patterns to test LLM capabilities.
"""

import sys
import random
from datetime import datetime, timedelta, timezone
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction


def create_test_users():
    """Create three test users with synthetic transaction data."""
    app = create_app()
    
    with app.app_context():
        print("Creating test users for LLM evaluation...")
        
        # Clear existing test users and their transactions
        test_usernames = ['test_coffee_addict', 'test_subscription_hoarder', 'test_impulse_shopper']
        for username in test_usernames:
            existing_user = User.query.filter_by(username=username).first()
            if existing_user:
                print(f"Deleting existing user: {username}")
                # Delete all transactions for this user first (NOT NULL constraint)
                Transaction.query.filter_by(user_id=existing_user.id).delete()
                db.session.delete(existing_user)
        db.session.commit()
        
        # Create test users
        test_users = []
        
        # User 1: Coffee Addict - tests pattern recognition and budgeting
        user1 = User(
            username='test_coffee_addict',
            email='coffee@test.pixie.ai',
            preferred_persona='the_analyst',
            interests=['budgeting', 'data analysis'],
            motivations=['save money'],
            location_enabled=True,
            interests_and_motivation_enabled=True
        )
        user1.set_password('TestPass123!')
        db.session.add(user1)
        db.session.commit()
        
        account1 = Account(
            user_id=user1.id,
            account_type='credit_card',
            account_name='Coffee Card',
            institution='Test Bank',
            card_last_4='1234'
        )
        db.session.add(account1)
        db.session.commit()
        
        # Generate 35 coffee purchases over 30 days (1-2 per day)
        base_date = datetime.now(timezone.utc) - timedelta(days=30)
        # Add 3 monthly salary deposits (income, positive)
        for month_offset in range(3):
            salary_date = base_date + timedelta(days=month_offset * 30)
            salary_tx = Transaction(
                user_id=user1.id,
                account_id=account1.id,
                date=salary_date,
                amount=12000.0,
                transaction_type='salary',
                category='Income',
                description='Monthly Salary',
                merchant='Employer Ltd',
                merchant_country='IL',
                is_recurring=True,
                categorization_source='heuristic',
                categorization_confidence=1.0
            )
            db.session.add(salary_tx)
        for i in range(35):
            days_offset = i * 30 // 35  # Spread over 30 days
            tx_date = base_date + timedelta(days=days_offset)
            
            # Vary coffee shops and prices
            coffee_shops = [
                ('Landwer Cafe', 25.0, 'IL'),
                ('Aroma Espresso Bar', 22.0, 'IL'),
                ('Cofix', 6.0, 'IL'),
                ('Cafe Joe', 28.0, 'IL')
            ]
            shop, price, country = coffee_shops[i % len(coffee_shops)]
            
            transaction = Transaction(
                user_id=user1.id,
                account_id=account1.id,
                date=tx_date,
                amount=-price,
                transaction_type='regular_payment',
                category='Food & Dining',
                description=f'Coffee at {shop}',
                merchant=shop,
                merchant_country=country,
                categorization_source='heuristic',
                categorization_confidence=1.0
            )
            db.session.add(transaction)
        
        test_users.append(user1)
        print(f"[OK] Created {user1.username} with 35 coffee transactions (persona: {user1.preferred_persona})")
        
        # User 2: Subscription Hoarder - tests subscription detection and optimization
        user2 = User(
            username='test_subscription_hoarder',
            email='subs@test.pixie.ai',
            preferred_persona='the_driver',
            interests=['efficiency', 'optimization'],
            motivations=['save money', 'control spending'],
            location_enabled=True,
            interests_and_motivation_enabled=True
        )
        user2.set_password('TestPass123!')
        db.session.add(user2)
        db.session.commit()
        
        account2 = Account(
            user_id=user2.id,
            account_type='credit_card',
            account_name='Subscription Card',
            institution='Test Bank',
            card_last_4='5678'
        )
        db.session.add(account2)
        db.session.commit()
        
        # Generate recurring subscriptions (expenses should be negative)
        subscriptions = [
            ('Netflix', 55.0, 'Entertainment'),
            ('Spotify', 19.99, 'Entertainment'),
            ('Apple iCloud', 39.0, 'Technology'),
            ('Amazon Prime', 49.0, 'Shopping'),
            ('New York Times', 89.0, 'News & Media'),
            ('Adobe Creative Cloud', 99.0, 'Professional Services')
        ]
        
        base_date = datetime.now(timezone.utc) - timedelta(days=90)
        # Add 3 monthly salary deposits (income, positive)
        for month_offset in range(3):
            salary_date = base_date + timedelta(days=month_offset * 30)
            salary_tx = Transaction(
                user_id=user2.id,
                account_id=account2.id,
                date=salary_date,
                amount=15000.0,
                transaction_type='salary',
                category='Income',
                description='Monthly Salary',
                merchant='Employer Ltd',
                merchant_country='IL',
                is_recurring=True,
                categorization_source='heuristic',
                categorization_confidence=1.0
            )
            db.session.add(salary_tx)
        for month_offset in range(3):  # 3 months of history
            for service, price, category in subscriptions:
                tx_date = base_date + timedelta(days=month_offset * 30)
                
                transaction = Transaction(
                    user_id=user2.id,
                    account_id=account2.id,
                    date=tx_date,
                    amount=-price,
                    transaction_type='recurring_payment',
                    category=category,
                    description=f'{service} Subscription',
                    merchant=service,
                    merchant_country='US',
                    is_recurring=True,
                    categorization_source='heuristic',
                    categorization_confidence=1.0
                )
                db.session.add(transaction)
        
        test_users.append(user2)
        print(f"[OK] Created {user2.username} with 6 subscriptions (persona: {user2.preferred_persona})")
        
        # User 3: Impulse Shopper - tests spending behavior analysis
        user3 = User(
            username='test_impulse_shopper',
            email='impulse@test.pixie.ai',
            preferred_persona='the_supportive',
            interests=['shopping', 'wellness'],
            motivations=['improve habits', 'reduce anxiety'],
            location_enabled=True,
            interests_and_motivation_enabled=True
        )
        user3.set_password('TestPass123!')
        db.session.add(user3)
        db.session.commit()
        
        account3 = Account(
            user_id=user3.id,
            account_type='credit_card',
            account_name='Shopping Card',
            institution='Test Bank',
            card_last_4='9012'
        )
        db.session.add(account3)
        db.session.commit()
        
        # Generate 20 impulse fashion/shopping purchases (expenses negative)
        base_date = datetime.now(timezone.utc) - timedelta(days=45)
        shopping_merchants = [
            ('Zara', 'Fashion & Apparel', 150, 450),
            ('H&M', 'Fashion & Apparel', 80, 300),
            ('Castro', 'Fashion & Apparel', 200, 600),
            ('Fox Home', 'Home & Garden', 100, 400),
            ('Shein', 'Fashion & Apparel', 50, 250),
            ('Amazon', 'Shopping', 100, 500)
        ]
        
        # Add 2 monthly salary deposits (income, positive)
        for month_offset in range(2):
            salary_date = base_date + timedelta(days=month_offset * 30)
            salary_tx = Transaction(
                user_id=user3.id,
                account_id=account3.id,
                date=salary_date,
                amount=11000.0,
                transaction_type='salary',
                category='Income',
                description='Monthly Salary',
                merchant='Employer Ltd',
                merchant_country='IL',
                is_recurring=True,
                categorization_source='heuristic',
                categorization_confidence=1.0
            )
            db.session.add(salary_tx)
        for i in range(20):
            days_offset = i * 45 // 20
            tx_date = base_date + timedelta(days=days_offset)
            
            merchant, category, min_price, max_price = shopping_merchants[i % len(shopping_merchants)]
            price = random.randint(min_price, max_price)
            
            transaction = Transaction(
                user_id=user3.id,
                account_id=account3.id,
                date=tx_date,
                amount=-price,
                transaction_type='online_purchase',
                category=category,
                description=f'Purchase from {merchant}',
                merchant=merchant,
                merchant_country='IL' if merchant in ['Zara', 'Castro', 'Fox Home'] else 'CN',
                categorization_source='heuristic',
                categorization_confidence=1.0
            )
            db.session.add(transaction)
        
        test_users.append(user3)
        print(f"[OK] Created {user3.username} with 20 shopping transactions")
        
        db.session.commit()
        print(f"\n[SUCCESS] Successfully created {len(test_users)} test users")
        print("\nTest users:")
        for user in test_users:
            print(f"  - {user.username} (persona: {user.preferred_persona})")
        
        return test_users

if __name__ == '__main__':
    create_test_users()
