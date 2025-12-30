from flask import Blueprint, jsonify, request
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.chat import ChatSession, ChatMessage
from app.models.transaction import Transaction
from app.services.llm_service import llm

bp = Blueprint('api', __name__)

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
