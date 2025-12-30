import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-please-change'
    
    # Database
    # If DATABASE_URL starts with postgres://, replace with postgresql:// for SQLAlchemy
    db_url = os.environ.get('DATABASE_URL') or 'sqlite:///pixie.db'
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-me'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # LLM Config
    LLM_MODEL = os.environ.get('LLM_MODEL', 'gpt-4')
    LLM_TEMPERATURE = float(os.environ.get('LLM_TEMPERATURE', 0.7))
    LLM_MAX_TOKENS = int(os.environ.get('LLM_MAX_TOKENS', 1000))

