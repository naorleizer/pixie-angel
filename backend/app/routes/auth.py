from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import User
from app.extensions import db
from app.services.llm_service import PERSONAS
import json

bp = Blueprint('auth', __name__)

# Valid enum values for user preferences
VALID_INTERESTS = [
    "restaurants",
    "food_delivery",
    "travel",
    "fitness",
    "fashion",
    "technology",
    "entertainment",
    "sports",
    "gaming",
    "education",
    "family",
    "home_improvement",
    "health"
]

VALID_MOTIVATIONS = [
    "saving_money",
    "financial_independence",
    "family_time",
    "minimalism",
    "financial_security",
    "long_term_stability",
    "freedom",
    "peace_of_mind",
    "family_support",
    "goal_achievement"
]

@bp.route('/personas', methods=['GET'])
def get_personas():
    """Return available personas with their descriptions."""
    return jsonify({
        persona_key: {
            'display_name': persona_data['display_name'],
            'description': persona_data['description']
        }
        for persona_key, persona_data in PERSONAS.items()
    }), 200

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing required fields'}), 400
        
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 400
        
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing username or password'}), 400
        
    user = User.query.filter_by(username=data['username']).first()
    
    if user is None or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid username or password'}), 401
        
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(user.to_dict()), 200
@bp.route('/user/preferences', methods=['PATCH'])
@jwt_required()
def update_user_preferences():
    """
    Update user preferences including preferred_persona, interests, and motivations.
    
    Expected JSON:
    {
        "preferred_persona": "the_analyst" | "the_driver" | "the_promoter" | "the_supportive",
        "interests": ["restaurants", "travel", ...],
        "motivations": ["saving_money", "financial_independence", ...]
    }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json()
    
    # Update preferred_persona if provided
    if 'preferred_persona' in data:
        preferred_persona = data['preferred_persona']
        # Validate persona type
        if preferred_persona not in PERSONAS:
            return jsonify({
                'message': f'Invalid persona type. Must be one of: {", ".join(PERSONAS.keys())}'
            }), 400
        user.preferred_persona = preferred_persona
        user.has_completed_persona_quiz = True
    
    # Update interests if provided
    if 'interests' in data:
        interests = data['interests']
        if not isinstance(interests, list):
            return jsonify({
                'message': 'interests must be an array'
            }), 400
        
        # Validate all interests are in the allowed list
        invalid_interests = [i for i in interests if i not in VALID_INTERESTS]
        if invalid_interests:
            return jsonify({
                'message': f'Invalid interests: {", ".join(invalid_interests)}. Must be one of: {", ".join(VALID_INTERESTS)}'
            }), 400
        
        user.interests = interests
    
    # Update motivations if provided
    if 'motivations' in data:
        motivations = data['motivations']
        if not isinstance(motivations, list):
            return jsonify({
                'message': 'motivations must be an array'
            }), 400
        
        # Validate all motivations are in the allowed list
        invalid_motivations = [m for m in motivations if m not in VALID_MOTIVATIONS]
        if invalid_motivations:
            return jsonify({
                'message': f'Invalid motivations: {", ".join(invalid_motivations)}. Must be one of: {", ".join(VALID_MOTIVATIONS)}'
            }), 400
        
        user.motivations = motivations

    # Update location_enabled if provided
    if 'location_enabled' in data:
        user.location_enabled = bool(data['location_enabled'])

    # Update interests_enabled if provided
    if 'interests_enabled' in data:
        user.interests_enabled = bool(data['interests_enabled'])

    # Update motivations_enabled if provided
    if 'motivations_enabled' in data:
        user.motivations_enabled = bool(data['motivations_enabled'])

    # Update communication_style if provided
    if 'communication_style' in data:
        user.communication_style = bool(data['communication_style'])
    
    db.session.commit()
    
    return jsonify(user.to_dict()), 200