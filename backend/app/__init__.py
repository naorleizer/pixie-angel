from flask import Flask
from config import Config
from app.extensions import db, migrate, cors, jwt
from dotenv import load_dotenv
from pathlib import Path
import logging
from logging.handlers import RotatingFileHandler
import os

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

    # Configure application logging: write to rotating file under instance/
    try:
        backend_root = Path(__file__).resolve().parent.parent
        instance_dir = backend_root / 'instance'
        instance_dir.mkdir(parents=True, exist_ok=True)
        log_file_path = instance_dir / 'pixie.log'

        log_level = logging.DEBUG if os.environ.get('FLASK_DEBUG', 'False').lower() == 'true' else logging.INFO
        formatter = logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s')

        file_handler = RotatingFileHandler(str(log_file_path), maxBytes=5 * 1024 * 1024, backupCount=3, encoding='utf-8')
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)

        # Attach handler to app logger and Werkzeug
        app.logger.setLevel(log_level)
        if not any(isinstance(h, RotatingFileHandler) for h in app.logger.handlers):
            app.logger.addHandler(file_handler)
        werkzeug_logger = logging.getLogger('werkzeug')
        werkzeug_logger.setLevel(log_level)
        if not any(isinstance(h, RotatingFileHandler) for h in werkzeug_logger.handlers):
            werkzeug_logger.addHandler(file_handler)
    except Exception as e:
        # Fallback: ensure at least a console log if file setup fails
        app.logger.error(f"Failed to configure file logging: {e}")

    return app

