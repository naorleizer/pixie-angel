# Pixie Backend - Flask LLM Server

This is the backend server for the Pixie money coach application. It handles all LLM logic and data processing.

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

# Edit .env and add your API keys
```

### Running the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

### API Endpoints

#### Health Check
- **GET** `/health` - Verify server is running

#### TODO: LLM Endpoints (to be implemented)
- **POST** `/api/chat` - Handle chat interactions with LLM
- **POST** `/api/challenge` - Create and manage savings challenges
- **POST** `/api/budget` - Get budget suggestions and calculations
- **POST** `/api/notification` - Generate proactive spending notifications

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
