# AGENTS Guidelines for Pixie

This file provides essential context for AI coding agents working on the Pixie money coach application.

## Quick Facts
- **Type**: Full-stack Web App (Frontend + Backend)
- **Frontend**: Vanilla JS (ES Modules), Vite, Tailwind CSS
- **Backend**: Python Flask, SQLAlchemy, LiteLLM (Gemini Flash 2.0)
- **Database**: SQLite (Dev), PostgreSQL (Prod ready)
- **Frontend Dev Server**: Port 5173 (`npm run dev`)
- **Backend API Server**: Port 35000 (`uv run run.py`)

---

## Current Project Status (Jan 12, 2026)

### ✅ Recently Completed
- **Merged branch changes** → Real app structure (not mockup)
- **Sidebar menu fixed** → Added "Import transactions" & "Transactions history" buttons
- **URL routing fixed** → Chat screen now updates URL (`#/chat`) so browser back button works

### 🚧 In Progress / Blockers
- **Challenges API**: Backend model exists, frontend needs real API calls instead of mock data
- **Transactions UI**: API exists but frontend UI not fully connected
- **Import transactions**: Screen exists but backend import pipeline needs validation

### 📋 Next Priority Tasks
1. Replace `challenge.js` mock state with real API calls to `/api/challenges`
2. Implement full transactions history UI (filter, sort, categorization)
3. Complete import transactions pipeline with validation feedback

---

## Development Server Usage

### Frontend
```bash
cd frontend
npm install              # First time only
npm run dev             # Starts at http://localhost:5173
```
**Hot Module Reload (HMR) enabled** — changes reflect instantly without refresh.

### Backend
```bash
cd backend
uv run run.py           # Starts at http://localhost:35000
```
Or with pip:
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

**Environment Setup**:
```bash
cp .env.example .env
# Edit .env: add GEMINI_API_KEY and JWT_SECRET_KEY
```

**Database migrations** (after model changes):
```bash
uv run flask db migrate -m "description"
uv run flask db upgrade
```

---

## Key Commands & Checks

| Task | Command | Notes |
|------|---------|-------|
| **Dev frontend** | `npm run dev` (in `/frontend`) | Keep running; HMR enabled |
| **Dev backend** | `uv run run.py` (in `/backend`) | Restart after model/route changes |
| **Run tests** | `npm run test` | Frontend (not yet; manual testing) |
| **Lint frontend** | `npm run lint` | ESLint on JS files |
| **Seed test data** | `uv run seed.py` | Populates DB with demo users/chats |
| **Clear DB** | `uv run clear_db.py` | Wipe all data (dev only) |
| **DB upgrade** | `uv run flask db upgrade` | Apply pending migrations |

---

## Coding Conventions

### Frontend (`frontend/src/`)
- **No framework** → Vanilla JS with ES Modules
- **Screens**: HTML templates in `src/screens/*.html` injected by `main.js`
- **API calls**: Always use `src/api.js` wrappers, never `fetch()` directly in components
- **Navigation**: Use `navigate(screenName)` from `src/navigation.js` to update URL
- **State**: Simple global object in `src/state.js` (not Redux; no heavy state lib)
- **Styling**: Tailwind CSS classes; minimal custom CSS in `styles.css`
- **Naming**: camelCase for functions/variables, kebab-case for HTML IDs/classes

### Backend (`backend/app/`)
- **Models**: Define in `app/models/` → imported in `routes/api.py`
- **Routes**: All endpoints in `app/routes/api.py` (no scattered blueprints)
- **LLM**: `app/services/llm_service.py` handles all Gemini calls
- **Auth**: Use `@jwt_required()` decorator on protected endpoints (except login/register)
- **Response format**: Always return `{ "key": value }` JSON; frontend expects `.key` properties
- **Naming**: snake_case for functions/variables, PascalCase for classes

---

## Architecture Overview

```
Frontend (Vite/Vanilla JS)     ←→     Backend (Flask)     ←→     Database (SQLite/Postgres)
  ↓                                      ↓                          ↓
src/main.js (entry)                 app/__init__.py (factory)   SQLAlchemy models
  ↓                                      ↓
src/screens/*.html (templates)      app/routes/api.py
src/navigation.js (routing)         app/services/llm_service.py
src/api.js (fetch client)           app/models/
src/chat.js (chat logic)                ├── user.py
src/dashboard.js (ui logic)             ├── challenge.py
src/challenge.js (challenges)           ├── chat.py
                                        └── transaction.py
```

---

## Critical Files for New Agents

| File | Why It Matters |
|------|----------------|
| `frontend/src/main.js` | App initialization, screen injection, event setup |
| `frontend/src/navigation.js` | Screen routing & URL sync (recent fix for back button) |
| `frontend/src/api.js` | All backend communication; auth token handling |
| `backend/app/__init__.py` | Flask factory, CORS setup, error handlers |
| `backend/app/routes/api.py` | All API endpoints (GET/POST/PUT/DELETE) |
| `backend/app/models/` | Database schemas (User, ChatSession, Challenge, etc) |
| `.github/copilot-instructions.md` | High-level rules & conventions |
| `.github/instructions/frontend.instructions.md` | Frontend-specific patterns |
| `.github/instructions/backend.instructions.md` | Backend-specific patterns |

---

## Known Gotchas

1. **Frontend Architecture**: No build output committed. `index.html` is a shell; actual screens injected at runtime via `main.js`.
2. **Chat Response Format**: Backend returns `{ "response": "..." }`. Frontend reads `.response` not `.content`.
3. **Auth Token**: Stored in `localStorage` key `pixie_auth_token`. Must be sent in every protected request header.
4. **CORS**: Backend allows localhost:5173 (frontend). If proxying, update config.
5. **Sidebar Integration**: Chats loaded from `/api/chat/sessions`, displayed in left sidebar (needs to be updated if chat API changes).
6. **Challenge State**: Currently mock data in `frontend/src/state.js`. Next task is wiring to real API.

---

## Testing & Validation

- **Manual Testing**: Open both dev servers, test login → chat → challenge creation flow
- **DB Check**: `sqlite3 backend/instance/pixie.db` to inspect schema & data
- **API Testing**: Use Postman or `curl` to test endpoints before frontend integration
- **Frontend Logs**: Check browser console for errors (F12 / DevTools)
- **Backend Logs**: Check terminal where `uv run run.py` is running

---

## When Adding a New Feature

1. **Define the data model** → Create/update `backend/app/models/`
2. **Add migration** → `uv run flask db migrate -m "your change"`, then `uv run flask db upgrade`
3. **Add API route** → Define endpoint in `backend/app/routes/api.py` with `@jwt_required()` if needed
4. **Test API** → Use Postman/curl before frontend integration
5. **Update frontend API client** → Add function to `frontend/src/api.js`
6. **Wire UI** → Update relevant JS module (e.g., `challenge.js`, `chat.js`) to call new API
7. **Update docs** → Add notes to AGENTS.md if architecture changes

---

## Trust These Instructions

Follow the patterns in this file. If something seems unclear or this doc is out of sync, search the codebase, but **assume this is the source of truth for agent work**.
