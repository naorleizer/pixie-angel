# Pixie Money Coach

Pixie is an AI-powered financial guardian angel application. It helps users track their finances, set challenges, and get personalized advice through an AI chat interface.

## 🚀 Quick Start

### 1. Backend Setup (Python)
The backend handles AI logic, user authentication, and data persistence.

```bash
cd backend
# Install dependencies and run (requires 'uv')
uv run run.py
```
*Note: If you don't have `uv`, see [backend/README.md](backend/README.md) for standard `pip` instructions.*

**Configuration:**
1. Copy `.env.example` to `.env`.
2. Add your `GEMINI_API_KEY` and `JWT_SECRET_KEY`.
3. Initialize the database: `uv run flask db upgrade`.

### 2. Frontend Setup (Node.js)
The frontend is a modern Vanilla JS application powered by Vite and Tailwind CSS.

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```
The application will be available at `http://localhost:5173`.

---

## 📂 Project Structure

```
mockup/
├── frontend/             # Root directory (Vite project)
│   ├── src/
│   │   ├── screens/      # HTML partials for each view
│   │   ├── api.js        # Backend API client
│   │   ├── chat.js       # Chat logic
│   │   ├── main.js       # App entry & screen injection
│   │   └── ...           # Other logic modules
│   ├── index.html        # App shell
│   └── package.json      # Frontend dependencies
├── backend/              # Flask server
│   ├── app/              # Application logic (Models, Routes)
│   ├── migrations/       # Database migrations
│   ├── run.py            # Server entry point
│   └── README.md         # Backend documentation
└── README.md             # This file
```

## 🛠 Technology Stack

- **Frontend**: Vanilla JS (ES Modules), Vite, Tailwind CSS.
- **Backend**: Python Flask, SQLAlchemy, LiteLLM (Gemini Flash 2.0).
- **Database**: SQLite (Development), PostgreSQL (Production ready).

## 📖 Documentation

- [Backend README](backend/README.md) - Detailed backend setup and API docs.
- [Agent Context](agent.md) - Technical overview for developers/AI agents.
- [Copilot Instructions](.github/copilot-instructions.md) - Project rules and conventions.

## 📜 License
[MIT](LICENSE)
