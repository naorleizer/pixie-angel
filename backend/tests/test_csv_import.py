"""
Test script to verify CSV import workflow with the new format.
Run with: python test_csv_import.py

Prerequisites:
1. Backend server should be running (python run.py)
2. User should be registered and logged in
"""

import requests
import json
from pathlib import Path

# Configuration
API_BASE = "http://localhost:35000/api"
AUTH_BASE = "http://localhost:35000/api/auth"

# Test credentials
TEST_USER = {
    "email": "test@pixie.com",
    "password": "testpassword123",
    "full_name": "Test User"
}

def register_or_login():
    """Register or login to get JWT token"""
    print("Attempting to login...")
    
    # Try login first
    login_resp = requests.post(
        f"{AUTH_BASE}/login",
        json={"email": TEST_USER["email"], "password": TEST_USER["password"]}
    )
    
    if login_resp.status_code == 200:
        print("✓ Login successful")
        return login_resp.json()["access_token"]
    
    # If login failed, try register
    print("Login failed, attempting to register...")
    register_resp = requests.post(
        f"{AUTH_BASE}/register",
        json=TEST_USER
    )
    
    if register_resp.status_code in [200, 201]:
        print("✓ Registration successful")
        return register_resp.json()["access_token"]
    
    raise Exception(f"Could not login or register: {register_resp.text}")


def upload_csv(token, csv_path):
    """Upload CSV file and get upload_id"""
    print(f"\nUploading CSV: {csv_path}")
    
    with open(csv_path, 'rb') as f:
        files = {'file': ('transactions.csv', f, 'text/csv')}
        headers = {'Authorization': f'Bearer {token}'}
        
        resp = requests.post(
            f"{API_BASE}/transactions/import",
            files=files,
            headers=headers
        )
    
    if resp.status_code == 202:
        upload_id = resp.json()['upload_id']
        print(f"✓ Upload started with ID: {upload_id}")
        return upload_id
    else:
        raise Exception(f"Upload failed: {resp.status_code} - {resp.text}")


def check_progress(token, upload_id):
    """Check upload progress"""
    import time
    
    headers = {'Authorization': f'Bearer {token}'}
    
    print("\nChecking import progress...")
    while True:
        resp = requests.get(
            f"{API_BASE}/transactions/import/{upload_id}/progress",
            headers=headers
        )
        
        if resp.status_code != 200:
            print(f"✗ Progress check failed: {resp.status_code}")
            break
        
        data = resp.json()
        progress = data.get('progress', 0)
        status = data.get('status', 'unknown')
        message = data.get('message', '')
        
        print(f"Progress: {progress}% - {status} - {message}")
        
        if status in ['completed', 'error']:
            if status == 'completed':
                print(f"\n✓ Import completed!")
                print(f"  Imported: {data.get('imported', 0)}")
                print(f"  Skipped: {data.get('skipped', 0)}")
                print(f"  Invalid: {data.get('invalid', 0)}")
            else:
                print(f"\n✗ Import failed: {message}")
            break
        
        time.sleep(2)


def get_transactions(token):
    """Fetch imported transactions"""
    print("\nFetching transactions...")
    headers = {'Authorization': f'Bearer {token}'}
    
    resp = requests.get(f"{API_BASE}/transactions", headers=headers)
    
    if resp.status_code == 200:
        transactions = resp.json()
        print(f"✓ Found {len(transactions)} transactions")
        
        # Show first 5
        for i, tx in enumerate(transactions[:5]):
            print(f"\n  Transaction {i+1}:")
            print(f"    Date: {tx.get('date')}")
            print(f"    Amount: {tx.get('amount')} {tx.get('currency')}")
            print(f"    Description: {tx.get('description')}")
            print(f"    Category: {tx.get('category')}")
            print(f"    Type: {tx.get('transaction_type')}")
            print(f"    Account ID: {tx.get('account_id')}")
    else:
        print(f"✗ Failed to fetch transactions: {resp.status_code}")


def main():
    print("=== Pixie CSV Import Test ===\n")
    
    # Step 1: Get auth token
    try:
        token = register_or_login()
    except Exception as e:
        print(f"✗ Authentication failed: {e}")
        return
    
    # Step 2: Upload CSV
    csv_path = Path(__file__).parent.parent / "model" / "user_upload_financial_activity_sample.csv"
    
    if not csv_path.exists():
        print(f"✗ CSV file not found: {csv_path}")
        return
    
    try:
        upload_id = upload_csv(token, csv_path)
    except Exception as e:
        print(f"✗ Upload failed: {e}")
        return
    
    # Step 3: Monitor progress
    check_progress(token, upload_id)
    
    # Step 4: Fetch and display results
    get_transactions(token)
    
    print("\n=== Test Complete ===")


if __name__ == "__main__":
    main()
