from flask import Flask
from config import Config
from app.extensions import db, migrate, cors, jwt
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the backend root so configuration is available early
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=str(env_path), verbose=True)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Flask extensions
    db.init_app(app)
    migrate.init_app(app, db)
    # Configure CORS explicitly to allow Authorization header for API calls
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    jwt.init_app(app)

    # Import models to ensure they are registered with SQLAlchemy
    from app.models.user import User
    from app.models.account import Account
    from app.models.transaction import Transaction
    from app.models.chat import ChatSession, ChatMessage
    from app.models.challenge import Challenge
    from app.models.notification import Notification
    from app.models.feedback import Feedback

    # Register Blueprints
    from app.routes.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    from app.routes.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Pixie Backend Running'}

    return app

