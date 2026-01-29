# Pixie Money Coach

Pixie is an AI-powered financial guardian angel application. It helps users track their finances, set savings challenges, and get personalized advice through an AI chat interface.

![Pixie Demo](docs/demo-screenshot.png)

## 🚀 Quick Start

### Option A: Docker (Recommended for Demo)

The fastest way to run Pixie with PostgreSQL database:

```bash
# 1. Configure backend environment
cd backend
cp .env.example .env
# Edit .env and set GEMINI_API_KEY (or another provider)
cd ..

# 2. Start all services
docker compose up --build

# 3. Initialize database (first time only, in a new terminal)
docker compose exec backend flask db upgrade

# 4. (Optional) Seed demo data
docker compose exec backend python scripts/seed.py
```

**Access the app at http://localhost**

Demo user credentials (after seeding):
- Username: `demo_user`
- Password: Value of `PIXIE_DEMO_PASSWORD` in your `backend/.env` (default: `demo123`)

---

### Option B: Manual Setup

#### Backend (Python 3.10+)

**Using uv (recommended):**
```bash
cd backend
uv sync
cp .env.example .env
# Edit .env and set GEMINI_API_KEY

uv run flask db upgrade
uv run python scripts/seed.py  # Optional: create demo user
uv run python run.py
```

**Using pip:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set GEMINI_API_KEY

flask db upgrade
python scripts/seed.py  # Optional: create demo user
python run.py
```

Backend runs at **http://localhost:35000**

#### Frontend (Node.js 18+)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## ⚙️ Configuration

### LLM Provider Setup

Pixie uses [LiteLLM](https://docs.litellm.ai/) which supports multiple LLM providers. Set the `LLM_MODEL` environment variable with the appropriate prefix:

| Provider | Model Example | Required Env Var |
|----------|---------------|------------------|
| Google AI Studio | `gemini/gemini-2.0-flash` | `GEMINI_API_KEY` |
| Vertex AI | `vertex_ai/gemini-2.5-pro` | `GOOGLE_APPLICATION_CREDENTIALS` + `VERTEXAI_PROJECT` |
| OpenAI | `gpt-4o` | `OPENAI_API_KEY` |
| Anthropic | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| Azure OpenAI | `azure/your-deployment` | `AZURE_API_KEY` + `AZURE_API_BASE` |

**Example: Switching from Gemini to OpenAI**
```env
# In backend/.env (or root .env for Docker)
LLM_MODEL=gpt-4o
OPENAI_API_KEY=sk-your-key-here
```

See [backend/.env.example](backend/.env.example) for all configuration options.

### Demo Data

To test the app with sample transactions:

1. **Seed the demo user:**
   ```bash
   # Set password in .env first
   PIXIE_DEMO_PASSWORD=demo123
   
   # Then run seed script
   cd backend
   python scripts/seed.py  # or: uv run python scripts/seed.py
   ```

2. **Import sample transactions:**
   - Log in as `demo_user`
   - Go to Import Transactions
   - Upload [model/demo_user_transactions.csv](model/demo_user_transactions.csv)

---

## 📂 Project Structure

```
pixie/
├── frontend/               # Vite + Vanilla JS frontend
│   ├── src/
│   │   ├── screens/        # HTML partials for each view
│   │   ├── api.js          # Backend API client
│   │   ├── chat.js         # AI chat logic
│   │   └── main.js         # App entry point
│   ├── Dockerfile          # Frontend container
│   └── nginx.conf          # Production server config
├── backend/                # Flask API server
│   ├── app/
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API endpoints
│   │   └── services/       # Business logic (LLM, etc.)
│   ├── scripts/            # Utility scripts
│   │   ├── seed.py         # Create demo user + data
│   │   └── clear_db.py     # Reset database
│   ├── tests/              # Test suite
│   ├── migrations/         # Alembic migrations
│   ├── Dockerfile          # Backend container
│   └── .env.example        # Environment template
├── model/                  # ML model & sample data
│   ├── demo_user_transactions.csv  # Sample CSV for import
│   └── classifier.ipynb    # Category classifier notebook
├── docs/                   # Additional documentation
├── docker-compose.yml      # Full stack orchestration
└── .env.docker.example     # Docker environment template
```

## 🛠 Technology Stack

- **Frontend**: Vanilla JavaScript (ES Modules), Vite 5, Tailwind CSS 3
- **Backend**: Python Flask 3.1, SQLAlchemy 3.1, LiteLLM
- **Database**: SQLite (dev) / PostgreSQL (Docker/production)
- **LLM**: Google Gemini, OpenAI, Anthropic, or any LiteLLM-supported provider

## 📖 Documentation

- [Backend Documentation](backend/README.md) - API details and backend setup
- [Agent Context](docs/agent.md) - Technical overview for developers
- [Copilot Instructions](.github/copilot-instructions.md) - Project conventions

## 🐳 Docker Commands

```bash
# Start all services
docker compose up --build

# View logs
docker compose logs -f backend

# Run database migrations
docker compose exec backend flask db upgrade

# Seed demo data
docker compose exec backend python scripts/seed.py

# Stop all services
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v
```

## 📜 License

[MIT](LICENSE)
