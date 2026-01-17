from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.chat import ChatSession, ChatMessage
from app.models.transaction import Transaction
from app.models.account import Account
from app.services.llm_service import llm
from app.services.categorization_service import categorize_transaction_waterfall, categorize_batch_llm
from app.services.account_service import get_or_create_account
import csv
import io
import uuid
import threading
from decimal import Decimal, InvalidOperation

from app.models.challenge import Challenge
from app.models.notification import Notification
from app.models.feedback import Feedback

bp = Blueprint('api', __name__)

# In-memory store for upload progress (upload_id -> {progress, status, result})
_upload_progress = {}

# --- Chat Endpoints ---

@bp.route('/chat/sessions', methods=['POST'])
@jwt_required()
def create_chat_session():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    title = data.get('title', 'New Chat')
    
    session = ChatSession(user_id=user_id, title=title)
    db.session.add(session)
    db.session.commit()
    
    return jsonify(session.to_dict()), 201

@bp.route('/chat/sessions', methods=['GET'])
@jwt_required()
def get_chat_sessions():
    user_id = get_jwt_identity()
    sessions = ChatSession.query.filter_by(user_id=user_id).order_by(ChatSession.updated_at.desc()).all()
    return jsonify([s.to_dict() for s in sessions]), 200

@bp.route('/chat/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_chat_history(session_id):
    user_id = get_jwt_identity()
    session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    
    messages = session.messages.order_by(ChatMessage.timestamp.asc()).all()
    return jsonify({
        'session': session.to_dict(),
        'messages': [m.to_dict() for m in messages]
    }), 200

@bp.route('/chat/sessions/<int:session_id>/messages', methods=['POST'])
@jwt_required()
def send_message(session_id):
    user_id = get_jwt_identity()
    session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    
    data = request.get_json()
    user_message = data.get('message')
    system_prompt = data.get('system_prompt') # Optional override
    
    if not user_message:
        return jsonify({'message': 'Message is required'}), 400
        
    try:
        # Use LLM Service to handle chat logic + persistence
        # Note: llm_service.chat_with_session handles saving both user and assistant messages
        response_content = llm.chat_with_session(
            session_id=session.id,
            user_message=user_message,
            system_prompt=system_prompt or "You are Pixie, a friendly AI money coach."
        )
        
        # Update session timestamp using a concrete UTC datetime
        session.updated_at = datetime.utcnow()

        # Auto-generate title if it's still default
        if session.title == 'New Chat':
            # Check message count
            msg_count = session.messages.count()
            if msg_count >= 2: # At least one exchange
                try:
                    # Generate title
                    history = session.messages.order_by(ChatMessage.timestamp.asc()).limit(4).all()
                    conversation_text = "\n".join([f"{m.role}: {m.content}" for m in history])
                    
                    title_prompt = f"Summarize the following conversation into a short, descriptive title (max 5 words). Do not use quotes.\n\n{conversation_text}"
                    
                    new_title = llm.chat_with_system(
                        user_message=title_prompt,
                        system_prompt="You are a helpful assistant that summarizes conversations."
                    )
                    
                    if new_title:
                        session.title = new_title.strip().strip('"')
                except Exception as e:
                    print(f"Failed to generate title: {e}")

        db.session.commit()
        
        return jsonify({
            'response': response_content
        }), 200
        
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# --- Transaction Endpoints ---

@bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.desc()).limit(50).all()
    result = []
    for t in transactions:
        tx_dict = t.to_dict()
        if t.account:
            tx_dict['account_name'] = t.account.account_name
            tx_dict['account_type'] = t.account.account_type
            tx_dict['card_last_4'] = t.account.card_last_4
        result.append(tx_dict)
    return jsonify(result), 200

@bp.route('/transactions/<int:transaction_id>', methods=['PATCH'])
@jwt_required()
def update_transaction(transaction_id):
    """
    Update transaction category manually.
    Tracks the change for future ML model retraining.
    """
    user_id = get_jwt_identity()
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first_or_404()
    
    data = request.get_json()
    new_category = data.get('category')
    
    # Store original category if this is the first manual change
    if transaction.categorization_source != 'manual':
        # Log the manual correction for future ML training
        current_app.logger.info(
            f"Manual category correction: Transaction {transaction_id} "
            f"changed from '{transaction.category}' (source: {transaction.categorization_source}) "
            f"to '{new_category}' by user {user_id}"
        )
    
    # Update category and mark as manually categorized
    transaction.category = new_category
    transaction.categorization_source = 'manual'
    transaction.categorization_confidence = 1.0  # Manual corrections are 100% confident
    
    db.session.commit()
    
    return jsonify(transaction.to_dict()), 200

@bp.route('/transactions/upload/<upload_id>/status', methods=['GET'])
@jwt_required()
def get_upload_status(upload_id):
    """
    Get the status of an ongoing or completed upload.
    """
    if upload_id not in _upload_progress:
        return jsonify({'message': 'Upload not found'}), 404
    
    return jsonify(_upload_progress[upload_id]), 200

@bp.route('/transactions/upload', methods=['POST'])
@jwt_required()
def upload_transactions():
    """
    Upload and import transactions from CSV file.
    Returns an upload_id for tracking progress.
    """
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'message': 'Only CSV files are supported'}), 400
    
    # Read file content immediately
    try:
        file_content = file.stream.read().decode('UTF8')
    except Exception as e:
        return jsonify({'message': f'Failed to read file: {str(e)}'}), 400
    
    # Generate upload ID
    upload_id = str(uuid.uuid4())
    
    # Initialize progress tracking
    _upload_progress[upload_id] = {
        'progress': 0,
        'status': 'processing',
        'message': 'Starting import...',
        'imported': 0,
        'skipped': 0,
        'invalid': 0
    }
    
    # Start background processing
    thread = threading.Thread(
        target=_process_csv_upload,
        args=(current_app._get_current_object(), upload_id, user_id, file_content)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({'upload_id': upload_id}), 202

def _process_csv_upload(app, upload_id: str, user_id: int, file_content: str):
    """
    Background task to process CSV upload with progress tracking.
    Supports the new CSV format with account information.
    """
    with app.app_context():
        try:
            stream = io.StringIO(file_content, newline=None)
            csv_reader = csv.DictReader(stream)
            
            # Convert to list to get total count
            rows = list(csv_reader)
            total_rows = len(rows)
            
            if total_rows == 0:
                _upload_progress[upload_id].update({
                    'progress': 100,
                    'status': 'completed',
                    'message': 'No rows found in CSV'
                })
                return
            
            transactions_to_add = []
            llm_needed = []
            skipped_count = 0
            invalid_count = 0
            accounts_cache = {}  # Cache accounts by unique key
            
            for idx, row in enumerate(rows):
                # Update progress
                progress = int((idx / total_rows) * 85)  # Reserve 85% for parsing, 10% for LLM, 5% for save
                _upload_progress[upload_id]['progress'] = progress
                _upload_progress[upload_id]['message'] = f'Processing row {idx + 1} of {total_rows}...'
                
                try:
                    # Parse amount (handle negative for expenses)
                    amount_str = row.get('Amount', '').replace('$', '').replace(',', '')
                    amount = float(amount_str)
                    
                    # Parse currency
                    currency = row.get('Currency', 'ILS').strip()
                    
                    # Parse date - try new format first (YYYY-MM-DD or similar)
                    date_str = row.get('Transaction Date', '').strip()
                    if date_str:
                        # Try common date formats
                        transaction_date = None
                        for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d']:
                            try:
                                transaction_date = datetime.strptime(date_str, fmt)
                                break
                            except ValueError:
                                continue
                        
                        if not transaction_date:
                            # Fallback to old format if exists
                            year = int(row.get('Year', 0))
                            month = int(row.get('Month', 0))
                            day = int(row.get('Day', 0))
                            if 1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31:
                                transaction_date = datetime(year, month, day)
                            else:
                                invalid_count += 1
                                continue
                    else:
                        invalid_count += 1
                        continue
                    
                    # Extract account information
                    account_type = row.get('Account Type', '').strip().lower()
                    account_name = row.get('Account Name', '').strip()
                    institution = row.get('Institution', '').strip() or None
                    card_last_4 = row.get('Card Last 4', '').strip() or None
                    
                    # Get or create account
                    account_key = f"{account_type}:{account_name}:{institution}:{card_last_4}"
                    if account_key not in accounts_cache:
                        account = get_or_create_account(
                            user_id=user_id,
                            account_type=account_type,
                            account_name=account_name,
                            institution=institution,
                            card_last_4=card_last_4,
                            currency=currency
                        )
                        accounts_cache[account_key] = account
                    else:
                        account = accounts_cache[account_key]
                    
                    # Parse transaction details
                    description = row.get('Description', '').strip()
                    balance_after = row.get('Balance After Transaction', '').replace(',', '').strip()
                    balance_after_val = float(balance_after) if balance_after else None
                    
                    transaction_type = row.get('Transaction Type', '').strip() or None
                    merchant_name = row.get('Merchant Name', '').strip() or None
                    merchant_country = row.get('Merchant Country', '').strip() or None
                    is_recurring_str = row.get('Is Recurring', 'False').strip().lower()
                    is_recurring = is_recurring_str in ['true', '1', 'yes']
                    
                    # For backwards compatibility, also check old fields
                    if not merchant_name:
                        merchant_name = row.get('Merchant', '').strip() or None
                    
                    # Priority for title: merchant_name > description > transaction_type > date fallback
                    title = merchant_name or description or transaction_type or f'Transaction on {transaction_date.strftime("%Y-%m-%d")}'
                    
                    merchant_city = row.get('Merchant City', '').strip() or None
                    merchant_state = row.get('Merchant State', '').strip() or None
                    mcc_code = row.get('MCC', '').strip() or None
                    
                    # Check for duplicates based on date, amount, description, and account
                    exists = Transaction.query.filter_by(
                        user_id=user_id,
                        account_id=account.id,
                        date=transaction_date,
                        amount=amount,
                        description=description
                    ).first()
                    
                    if exists:
                        skipped_count += 1
                        continue
                    
                    # Categorization pipeline - waterfall with confidence scoring
                    # Each transaction gets a category, confidence score, and source (heuristic/ml/llm/manual)
                    category_val, confidence, source = categorize_transaction_waterfall(
                        merchant_name=merchant_name or description,
                        mcc_code=mcc_code,
                        amount=amount,
                        transaction_type=transaction_type,
                        merchant_city=merchant_city,
                        merchant_state=merchant_state,
                        use_chip=None  # Not available in CSV, defaults to None
                    )
                    
                    # If waterfall stages succeeded, mark category as set
                    # If category is None, it means all stages either failed or had insufficient confidence
                    # These will be categorized in a batch LLM call at the end
                    
                    transaction = Transaction(
                        user_id=user_id,
                        account_id=account.id,
                        date=transaction_date,
                        amount=amount,
                        currency=currency,
                        description=title,
                        balance_after=balance_after_val,
                        transaction_type=transaction_type,
                        merchant=merchant_name,
                        merchant_country=merchant_country,
                        merchant_city=merchant_city,
                        merchant_state=merchant_state,
                        mcc=mcc_code,
                        is_recurring=is_recurring,
                        is_fraud=row.get('Is Fraud?', 'No').strip().lower() == 'yes',
                        import_source='CSV Upload',
                        category=category_val,
                        categorization_confidence=confidence,
                        categorization_source=source
                    )
                    
                    # Queue for LLM if not categorized
                    if not category_val:
                        llm_needed.append({
                            'index': len(transactions_to_add),
                            'merchant': merchant_name or description,
                            'amount': amount,
                            'mcc': mcc_code,
                            'transaction_type': transaction_type,
                            'description': description,
                            'merchant_country': merchant_country,
                            'date': transaction_date.isoformat(),
                        })
                    
                    transactions_to_add.append(transaction)
                    
                except (ValueError, KeyError, InvalidOperation) as e:
                    invalid_count += 1
                    continue
            
            # LLM categorization for remaining items (batch processing for efficiency)
            if llm_needed:
                _upload_progress[upload_id]['progress'] = 90
                _upload_progress[upload_id]['message'] = f'Categorizing {len(llm_needed)} items with AI...'
                
                try:
                    mapping = categorize_batch_llm(llm_needed)
                    for entry in llm_needed:
                        idx = entry['index']
                        if idx in mapping:
                            result = mapping[idx]
                            try:
                                # Update transaction with LLM categorization
                                trans = transactions_to_add[idx]
                                trans.category = result.get('category')
                                trans.categorization_confidence = result.get('confidence', 0.0)
                                trans.categorization_source = 'llm'
                            except Exception as e:
                                current_app.logger.error(f"Failed to update LLM result for index {idx}: {e}")
                except Exception as e:
                    # LLM failure - log but continue with what we have
                    current_app.logger.error(f"LLM batch categorization failed: {e}")
                    # Items remain with category=None, confidence=None, source=None
                    # User can review and manually categorize these later
            
            # Bulk insert
            _upload_progress[upload_id]['progress'] = 95
            _upload_progress[upload_id]['message'] = 'Saving transactions...'
            
            if transactions_to_add:
                db.session.bulk_save_objects(transactions_to_add)
                db.session.commit()
            
            # Count items that still need categorization
            uncategorized = sum(1 for t in transactions_to_add if t.category is None)
            
            # Complete
            message = f'Import completed: {len(transactions_to_add)} transactions added'
            if uncategorized > 0:
                message += f', {uncategorized} items need manual review'
            
            _upload_progress[upload_id].update({
                'progress': 100,
                'status': 'completed',
                'message': message,
                'imported': len(transactions_to_add),
                'skipped': skipped_count,
                'invalid': invalid_count,
                'uncategorized': uncategorized
            })
            
        except Exception as e:
            _upload_progress[upload_id].update({
                'progress': 100,
                'status': 'error',
                'message': f'Import failed: {str(e)}'
            })
            db.session.rollback()

# --- Challenge Endpoints ---

@bp.route('/challenges', methods=['GET'])
@jwt_required()
def get_challenges():
    user_id = get_jwt_identity()
    challenges = Challenge.query.filter_by(user_id=user_id, status='active').all()
    return jsonify([c.to_dict() for c in challenges]), 200

@bp.route('/challenges', methods=['POST'])
@jwt_required()
def create_challenge():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    challenge = Challenge(
        user_id=user_id,
        title=data.get('title'),
        description=data.get('description'),
        type=data.get('type', 'spending_limit'),
        target_amount=data.get('target_amount', 0),
        color=data.get('color', 'indigo'),
        end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None
    )
    
    db.session.add(challenge)
    db.session.commit()
    
    return jsonify(challenge.to_dict()), 201

# --- Notification Endpoints ---

@bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    # Return all unread first, then recent read ones
    notifications = Notification.query.filter_by(user_id=user_id).order_by(
        Notification.is_read.asc(), 
        Notification.created_at.desc()
    ).limit(20).all()
    
    return jsonify({
        'items': [n.to_dict() for n in notifications],
        'unread_count': Notification.query.filter_by(user_id=user_id, is_read=False).count()
    }), 200

@bp.route('/notifications/<int:id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(id):
    user_id = get_jwt_identity()
    notification = Notification.query.filter_by(id=id, user_id=user_id).first_or_404()
    
    notification.is_read = True
    db.session.commit()
    
    return jsonify({'success': True}), 200


# --- Feedback Endpoint ---
@bp.route('/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    name = data.get('name')
    message = data.get('message') or data.get('feedback')

    if not message or not message.strip():
        return jsonify({'message': 'Feedback message is required'}), 400

    fb = Feedback(user_id=user_id, name=name, message=message.strip())
    db.session.add(fb)
    db.session.commit()

    return jsonify(fb.to_dict()), 201

# --- Categories Endpoint ---
@bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    try:
        from app.services.categorization_service import CATEGORIES
        return jsonify({'categories': CATEGORIES}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@jwt_required()
@bp.route('/test-llm', methods=['POST'])
def test_llm():

    """Test endpoint to verify LLM integration"""
    try:
        data = request.get_json()
        message = data.get('message', 'Hello!')
        
        response = llm.chat_with_system(
            user_message=message,
            system_prompt="You are Pixie, a friendly AI money coach."
        )
        
        return jsonify({
            'success': True,
            'response': response
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Placeholder for future endpoints
@bp.route('/users', methods=['GET'])
def get_users():
    return jsonify({'message': 'User management endpoint'})
