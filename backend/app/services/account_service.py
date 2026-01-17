"""
Account inference service for transaction imports.

This service helps infer and manage accounts from imported transaction data.
"""

from typing import Dict, Optional
from app.extensions import db
from app.models.account import Account


def get_or_create_account(
    user_id: int,
    account_type: str,
    account_name: str,
    institution: Optional[str] = None,
    card_last_4: Optional[str] = None,
    currency: str = 'ILS'
) -> Account:
    """
    Get an existing account or create a new one based on unique identifiers.
    
    Accounts are uniquely identified by:
    - user_id
    - account_type
    - account_name
    - institution (optional)
    - card_last_4 (for cards)
    
    Args:
        user_id: The user's ID
        account_type: Type of account (checking, savings, credit_card)
        account_name: User-friendly account name
        institution: Bank or card issuer name
        card_last_4: Last 4 digits of card (if applicable)
        currency: Account currency (default: ILS)
        
    Returns:
        Account object (either existing or newly created)
    """
    # Build query filters
    filters = {
        'user_id': user_id,
        'account_type': account_type.lower().strip(),
        'account_name': account_name.strip()
    }
    
    # Add optional filters if provided
    if institution:
        filters['institution'] = institution.strip()
    
    if card_last_4:
        filters['card_last_4'] = card_last_4.strip()
    
    # Try to find existing account
    account = Account.query.filter_by(**filters).first()
    
    if account:
        return account
    
    # Create new account
    account = Account(
        user_id=user_id,
        account_type=filters['account_type'],
        account_name=filters['account_name'],
        institution=institution.strip() if institution else None,
        card_last_4=card_last_4.strip() if card_last_4 else None,
        currency=currency
    )
    
    db.session.add(account)
    db.session.flush()  # Get the ID without committing
    
    return account
