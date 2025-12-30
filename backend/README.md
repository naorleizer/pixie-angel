# Pixie Backend - Flask LLM Server

This is the backend server for the Pixie money coach application. It handles user data, transaction history, and LLM logic.

## Architecture

- **Flask Application Factory**: Modular structure in `app/`
- **Database**: SQLAlchemy ORM (SQLite for dev, Postgres ready)
- **Authentication**: JWT (JSON Web Tokens)
- **LLM Integration**: LiteLLM for multi-provider support
- **Migrations**: Flask-Migrate (Alembic)

## Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Create a virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your API keys and JWT secret
```

4. Initialize the database:
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

5. Seed mock data (optional):
```bash
python seed.py
```

### Running the Server

```bash
python run.py
```

The server will start on `http://localhost:5000`

### API Endpoints

#### Auth
- **POST** `/api/auth/register` - Register a new user
- **POST** `/api/auth/login` - Login and get JWT token
- **GET** `/api/auth/me` - Get current user info (requires JWT)

#### Health Check
- **GET** `/health` - Verify server is running


## Development

The backend is organized as follows:
- `app.py` - Main Flask application and route definitions
- `requirements.txt` - Python dependencies
- `.env` - Environment variables (API keys, configuration)
- `.gitignore` - Files to exclude from git

### Adding New Endpoints

Add new routes in `app.py` following the Flask pattern:

```python
@app.route('/api/your-endpoint', methods=['POST'])
def your_endpoint():
    data = request.get_json()
    # Process with LLM
    return jsonify({'result': 'response'})
```
