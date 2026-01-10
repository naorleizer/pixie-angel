from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.chat import ChatSession, ChatMessage
from app.models.transaction import Transaction
from app.services.llm_service import llm
from app.services.categorization_service import categorize_transaction, categorize_batch_llm
import csv
import io
import uuid
import threading
from decimal import Decimal, InvalidOperation

from app.models.challenge import Challenge
from app.models.notification import Notification

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
    return jsonify([t.to_dict() for t in transactions]), 200

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
            
            for idx, row in enumerate(rows):
                # Update progress
                progress = int((idx / total_rows) * 85)  # Reserve 85% for parsing, 10% for LLM, 5% for save
                _upload_progress[upload_id]['progress'] = progress
                _upload_progress[upload_id]['message'] = f'Processing row {idx + 1} of {total_rows}...'
                
                try:
                    # Parse amount
                    amount_str = row.get('Amount', '').replace('$', '').replace(',', '')
                    amount = float(amount_str)
                    
                    # Parse date
                    year = int(row.get('Year', 0))
                    month = int(row.get('Month', 0))
                    day = int(row.get('Day', 0))
                    
                    if not (1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31):
                        invalid_count += 1
                        continue
                    
                    # Parse time if available
                    time_str = row.get('Time', '00:00')
                    try:
                        hour, minute = map(int, time_str.split(':'))
                        transaction_date = datetime(year, month, day, hour, minute)
                    except:
                        transaction_date = datetime(year, month, day)
                    
                    merchant_name = row.get('Merchant Name', '').strip()
                    merchant_city = row.get('Merchant City', '').strip()
                    merchant_state = row.get('Merchant State', '').strip()
                    mcc_code = row.get('MCC', '').strip() or None
                    
                    # Check for duplicates
                    exists = Transaction.query.filter_by(
                        user_id=user_id,
                        date=transaction_date,
                        amount=amount,
                        merchant=merchant_name
                    ).first()
                    
                    if exists:
                        skipped_count += 1
                        continue
                    
                    # Categorization pipeline
                    cat = categorize_transaction(merchant_name, mcc_code, amount)
                    category_val = cat[0] if cat else None
                    tx_type_val = cat[1] if cat else None
                    
                    transaction = Transaction(
                        user_id=user_id,
                        date=transaction_date,
                        amount=amount,
                        merchant=merchant_name,
                        merchant_city=merchant_city if merchant_city else None,
                        merchant_state=merchant_state if merchant_state else None,
                        merchant_zip=row.get('Zip', '').strip() or None,
                        mcc=mcc_code,
                        use_chip=row.get('Use Chip', '').strip() or None,
                        is_fraud=row.get('Is Fraud?', 'No').strip().lower() == 'yes',
                        import_source='CSV Upload',
                        category=category_val
                    )
                    
                    # Queue for LLM if not categorized
                    if not category_val:
                        llm_needed.append({
                            'index': len(transactions_to_add),
                            'merchant': merchant_name,
                            'amount': amount,
                            'mcc': mcc_code,
                            'city': merchant_city,
                            'state': merchant_state,
                            'zip': row.get('Zip', '').strip() or None,
                            'description': row.get('Errors?', '').strip() or None,
                            'date': transaction_date.isoformat(),
                        })
                    
                    transactions_to_add.append(transaction)
                    
                except (ValueError, KeyError, InvalidOperation) as e:
                    invalid_count += 1
                    continue
            
            # LLM categorization for remaining items
            if llm_needed:
                _upload_progress[upload_id]['progress'] = 90
                _upload_progress[upload_id]['message'] = f'Categorizing {len(llm_needed)} items with AI...'
                
                mapping = categorize_batch_llm(llm_needed)
                for entry in llm_needed:
                    idx = entry['index']
                    if idx in mapping:
                        result = mapping[idx]
                        try:
                            transactions_to_add[idx].category = result.get('category')
                        except Exception:
                            pass
            
            # Bulk insert
            _upload_progress[upload_id]['progress'] = 95
            _upload_progress[upload_id]['message'] = 'Saving transactions...'
            
            if transactions_to_add:
                db.session.bulk_save_objects(transactions_to_add)
                db.session.commit()
            
            # Complete
            _upload_progress[upload_id].update({
                'progress': 100,
                'status': 'completed',
                'message': 'Import completed',
                'imported': len(transactions_to_add),
                'skipped': skipped_count,
                'invalid': invalid_count
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

# --- Categories Endpoint ---
@bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    try:
        from app.services.categorization_service import CATEGORIES
        return jsonify({'categories': CATEGORIES}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

# --- Transaction Update Endpoint ---
@bp.route('/transactions/<int:id>', methods=['PATCH'])
@jwt_required()
def update_transaction(id):
    user_id = get_jwt_identity()
    tx = Transaction.query.filter_by(id=id, user_id=user_id).first_or_404()
    data = request.get_json() or {}
    category = data.get('category')
    if category is not None:
        tx.category = category
    # Future: support type, notes
    db.session.commit()
    return jsonify(tx.to_dict()), 200

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
