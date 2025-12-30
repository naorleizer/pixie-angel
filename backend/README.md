# Pixie Backend - Flask LLM Server

This is the backend server for the Pixie money coach application. It handles user data, transaction history, and LLM logic.

## Architecture

- **Flask Application Factory**: Modular structure in `app/`
- **Database**: SQLAlchemy ORM (SQLite for dev, Postgres ready)
- **Authentication**: JWT (JSON Web Tokens)
- **LLM Integration**: LiteLLM for multi-provider support (Gemini Flash 2.0)
- **Migrations**: Flask-Migrate (Alembic)
- **Package Manager**: `uv` (recommended) or `pip`

## Setup

### Prerequisites
- Python 3.10 or higher
- [uv](https://github.com/astral-sh/uv) (recommended) or `pip`

### Installation & Running (with `uv`)

1. **Install dependencies and run**:
   ```bash
   uv run run.py
   ```
   *This will automatically create a virtual environment and install dependencies.*

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY and JWT_SECRET_KEY
   ```

3. **Initialize the database**:
   ```bash
   uv run flask db upgrade
   ```

4. **Seed mock data (optional)**:
   ```bash
   uv run python seed.py
   ```

### Installation & Running (with `pip`)

1. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server**:
   ```bash
   python run.py
   ```

The server will start on `http://localhost:35000` (default port for Pixie).

## API Endpoints

### Auth
- **POST** `/api/auth/register` - Register a new user
- **POST** `/api/auth/login` - Login and get JWT token
- **GET** `/api/auth/me` - Get current user info (requires JWT)

### Chat
- **POST** `/api/chat/sessions` - Create a new chat session
- **GET** `/api/chat/sessions` - List user chat sessions
- **POST** `/api/chat/sessions/<id>/messages` - Send a message to a session

### Health Check
- **GET** `/health` - Verify server is running

## Development

The backend is organized as follows:
- `app/` - Application logic, models, and routes
- `run.py` - Entry point for the Flask server
- `seed.py` - Script to populate the database with initial data
- `.env` - Environment variables (API keys, configuration)
- `migrations/` - Database migration files
