# GitHub Copilot Instructions for Pixie

You are an expert AI programming assistant working on **Pixie**, an AI-powered financial guardian angel application — a money coach that helps users track finances, set savings challenges, and get personalized financial advice via AI chat.

## Project Overview
- **Type**: Full-stack Web Application
- **Frontend**: Vanilla JavaScript (ES Modules), Vite 5.4+, Tailwind CSS 3.4+
- **Backend**: Python Flask 3.1+, SQLAlchemy 3.1+, LiteLLM (Multi-provider: Gemini, OpenAI, Anthropic)
- **Database**: SQLite (Local Dev), PostgreSQL 15 (Docker/Production)
- **Deployment**: Docker Compose (recommended) or manual setup with uv/pip
- **Status**: Demo-ready. Features include: user auth, AI chat with 3 tools, challenges (create/update/filter), transaction import with ML categorization, account settings, real-time dashboard widgets. Fully containerized with Docker Compose.

## Tech Stack & Key Conventions

### Frontend (`frontend/src/`)
- **Architecture**: No framework — vanilla ES modules. HTML screens in `src/screens/*.html` injected at runtime by `main.js` using Vite's `?raw` import syntax
- **Key Files**:
  - `main.js`: Entry point; imports all screen HTML, injects sidebar/screens into DOM, exposes window functions for onclick handlers
  - `navigation.js`: URL-aware routing; `navigate(screenName)` updates hash, manages browser history + back button
  - `api.js`: Single point for all backend communication; wraps `fetch()`, handles JWT token injection, 401 redirects
  - `state.js`: Simple global state object (not Redux) — no watchers, manual UI updates after state changes
  - `*.js` (chat.js, dashboard.js, challenge.js, etc.): UI logic modules; define `init*()` functions called by main.js
- **State Management**: Flat global object in `state.js`; update directly and manually re-render UI
- **Navigation Pattern**: Use `navigate()` for user-driven screen changes (updates URL, enables back button); use `showScreen()` only internally
- **API Calls**: **ALWAYS** import from `api.js`, never `fetch()` directly. Example: `import { apiRequest } from "./api.js"; await apiRequest("/api/challenges")`
- **Auth**: JWT token in `localStorage['pixie_auth_token']`; sent in Authorization header by api.js
- **Styling**: Tailwind CSS classes; custom CSS in `styles.css` only for animations/complex layouts
- **Naming**: camelCase functions/variables, kebab-case HTML IDs/classes

### Backend (`backend/app/`)
- **Framework**: Flask with factory pattern in `app/__init__.py`; extensions (db, jwt, cors, migrate) initialized in `extensions.py`
- **Routes**: All endpoints in `app/routes/api.py` + `app/routes/auth.py` (no scattered blueprints)
- **Models**: SQLAlchemy in `app/models/` (user.py, challenge.py, chat.py, transaction.py, notification.py); each has `to_dict()` for JSON serialization
- **LLM Service**: All Gemini calls in `app/services/llm_service.py` via LiteLLM; `llm.chat_with_session()` handles message persistence
- **Auth**: JWT-based; `@jwt_required()` on protected endpoints; `get_jwt_identity()` retrieves user_id
- **Response Format**: Always `jsonify(key=value)` or `jsonify([items])`; frontend reads like `response.key` or `response[0]`
- **Database Migrations**: Alembic in `migrations/`; create with `uv run flask db migrate -m "description"`, apply with `uv run flask db upgrade`
- **Naming**: snake_case for functions/variables, PascalCase for classes
- **Environment**: Load from `.env` in backend root (see `.env.example`); key vars: GEMINI_API_KEY, JWT_SECRET_KEY, DATABASE_URL

## Critical Commands

| Task | Command | Notes |
|------|---------|-------|
| Docker start | `docker compose up --build -d` (in root) | Full stack at http://localhost:8080 |
| Docker logs | `docker compose logs -f backend` | Watch backend output |
| Docker stop | `docker compose down` | Stop all containers |
| Docker reset | `docker compose down -v` | Stop + delete database volume |
| Frontend dev | `npm run dev` (in `frontend/`) | Vite @ http://localhost:5173; HMR enabled |
| Backend dev | `uv run run.py` (in `backend/`) | Flask @ http://localhost:35000; restart on route/model changes |
| DB upgrade | `uv run flask db upgrade` | Apply pending migrations after model changes |
| Seed test data | `uv run scripts/seed.py` | Populate with demo users, chats, challenges |
| Reset DB | `uv run scripts/clear_db.py` | Wipe all data (dev only) |
| Frontend build | `npm run build` | Output in `frontend/dist/` |

**Setup Before First Run (Manual)**:
- Backend: Copy `backend/.env.example` → `.env`; add GEMINI_API_KEY (or other LLM key) + JWT_SECRET_KEY; run `uv run flask db upgrade`
- Frontend: `npm install` (once)

**Setup with Docker** (simplest):
- Copy `backend/.env.example` → `backend/.env`; add API keys
- Run `docker compose up --build -d`
- Access at http://localhost:8080

## Critical Patterns & Examples

### Frontend: API Calls via api.js Wrapper
```javascript
// ✅ CORRECT: Always use api.js
import { apiRequest } from "./api.js";
const challenges = await apiRequest("/api/challenges");

// ✅ Or use specific wrapper function
import { createChatSession } from "./api.js";
const session = await createChatSession("New Chat");

// ❌ WRONG: Never fetch directly in components
const response = await fetch("/api/challenges");
```

### Frontend: Screen Navigation (URL-Aware)
```javascript
// ✅ CORRECT: User-initiated navigation updates URL + history
import { navigate } from "./navigation.js";
button.onclick = () => navigate("chat");  // URL → #/chat, enables back button

// ⚠ showScreen() for internal use only (init, auth checks)
showScreen("screen-dashboard", false);  // No URL update
```

### Backend: Protected Routes + Proper Response
```python
# ✅ CORRECT: @jwt_required() + return jsonify()
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.challenge import Challenge

@bp.route('/challenges', methods=['GET'])
@jwt_required()
def get_challenges():
    user_id = get_jwt_identity()
    challenges = Challenge.query.filter_by(user_id=user_id).all()
    return jsonify([c.to_dict() for c in challenges])

@bp.route('/challenges', methods=['POST'])
@jwt_required()
def create_challenge():
    user_id = get_jwt_identity()
    data = request.get_json()
    challenge = Challenge(user_id=user_id, title=data['title'])
    db.session.add(challenge)
    db.session.commit()
    return jsonify(challenge.to_dict()), 201
```

### Backend: LLM Integration
```python
# ✅ Use llm service for all Gemini calls
from app.services.llm_service import llm

@bp.route('/chat/sessions/<int:session_id>/messages', methods=['POST'])
@jwt_required()
def send_message(session_id):
    user_id = get_jwt_identity()
    session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first_or_404()
    data = request.get_json()
    
    # llm.chat_with_session() handles message persistence + Gemini call
    response = llm.chat_with_session(
        session_id=session.id,
        user_message=data['message'],
        system_prompt="You are Pixie, a friendly AI money coach."
    )
    return jsonify(response=response)
```

## Known Gotchas & Quirks

1. **Frontend Shell Architecture**: `index.html` is just a root div. All screens injected by `main.js` from `src/screens/*.html` — never assume pre-rendered HTML.

2. **Navigation: `navigate()` vs `showScreen()`**: 
   - `navigate()` = user clicks button → updates URL, enables back button
   - `showScreen()` = internal app logic → no URL update
   - Mixing them breaks browser history

3. **Chat Response Key**: Backend returns `{ "response": "text content" }`. Frontend reads `.response`, not `.content` or others.

4. **JWT Token Persistence**: Stored in `localStorage['pixie_auth_token']`. api.js injects automatically, but 401 responses trigger redirect to login.

5. **Sidebar Injection**: Sidebar HTML injected in `main.js`, persists across screens. Chat sessions load from `/api/chat/sessions`. If adding new chat endpoints, update sidebar loader.

6. **LLM Model Config**: Set via `LLM_MODEL` env var. **Important**: Use provider prefix for LiteLLM:
   - Google AI Studio: `gemini/gemini-2.0-flash` (simple API key)
   - Vertex AI: `vertex_ai/gemini-2.0-flash` (requires GCP setup)
   - OpenAI: `gpt-4o` or `gpt-4o-mini`
   - Anthropic: `claude-sonnet-4-20250514`

7. **Backend API Port**: Backend runs on port 35000 (not 5000). Frontend's `api.js` uses `VITE_API_URL` env var or defaults to 35000.

8. **Transactions Import**: Async background job via `/api/transactions/import`. Uses threading + in-memory progress store (`_upload_progress` dict in api.py).

9. **Challenge Updates System**: 
   - Challenges track progress via `ChallengeUpdate` records with signed amounts (positive=savings, negative=spending)
   - `current_amount` is computed from sum of all updates (not stored in DB column)
   - `status` computed based on `end_date`: active before deadline, completed/failed after
   - Dashboard modal opens on card click (doesn't navigate); all challenges screen has separate modal
   - Balance widget shows total: "Saved: X₪" (green) when positive, "Overspent: X₪" (red) when negative

10. **Docker PostgreSQL vs Local SQLite**: Migrations must use `sa.text('FALSE')` for boolean defaults (not `'0'`) for PostgreSQL compatibility.

11. **Static Assets in Docker**: Frontend assets must be in `public/assets/` for Vite to copy them to the build output.
   - `status` computed based on `end_date`: active before deadline, completed/failed after
   - Dashboard modal opens on card click (doesn't navigate); all challenges screen has separate modal
   - Balance widget shows total: "Saved: X₪" (green) when positive, "Overspent: X₪" (red) when negative

## Project File Structure

```
mockup/
├── docker-compose.yml              # Full stack deployment (PostgreSQL, backend, frontend)
├── .dockerignore                   # Exclude files from Docker build context
├── frontend/
│   ├── Dockerfile                  # Multi-stage build (Node → nginx)
│   ├── nginx.conf                  # Serves SPA, proxies /api/ to backend
│   ├── public/
│   │   └── assets/                 # Static images (db/, images/)
│   ├── src/
│   │   ├── screens/                # HTML templates: login.html, dashboard.html, chat.html, etc.
│   │   ├── main.js                 # Entry point; DOM setup, screen injection, window function exports
│   │   ├── navigation.js           # URL routing, back button, navigate() function
│   │   ├── api.js                  # Backend client wrapper (JWT injection, error handling)
│   │   ├── state.js                # Global app state object
│   │   ├── chat.js                 # Chat UI logic, message rendering
│   │   ├── dashboard.js            # Dashboard carousel, challenge cards, detail modal
│   │   ├── challenge.js            # Challenge creation form
│   │   ├── challenges.js           # All challenges list, filters, detail modal
│   │   ├── auth.js                 # Login, register, token management
│   │   ├── transactions.js         # Transaction list, filtering
│   │   ├── import-transactions.js  # CSV import workflow
│   │   ├── budget.js               # Budget adjustment logic
│   │   ├── notifications.js        # Notification UI + badge updates
│   │   ├── onboarding.js           # Onboarding carousel
│   │   └── styles.css              # Tailwind + minimal custom CSS
│   ├── index.html                  # Root div shell only
│   ├── vite.config.js              # Vite config (HMR, build)
│   ├── tailwind.config.js          # Tailwind setup
│   └── package.json                # Dependencies (Vite, Tailwind, PostCSS)
├── backend/
│   ├── Dockerfile                  # Python 3.11 + gunicorn
│   ├── app/
│   │   ├── __init__.py             # Flask factory, extension init, blueprint registration
│   │   ├── extensions.py           # db, jwt, cors, migrate instances
│   │   ├── config.py               # Config class (DB URI, JWT secret, LLM settings)
│   │   ├── routes/
│   │   │   ├── api.py              # Main endpoints: chat, challenges, transactions, etc.
│   │   │   └── auth.py             # Login, register, token refresh
│   │   ├── models/
│   │   │   ├── user.py             # User model + to_dict()
│   │   │   ├── chat.py             # ChatSession, ChatMessage + to_dict()
│   │   │   ├── challenge.py        # Challenge, ChallengeUpdate models
│   │   │   ├── transaction.py      # Transaction model
│   │   │   ├── account.py          # Account model
│   │   │   ├── notification.py     # Notification model
│   │   │   └── feedback.py         # Feedback model
│   │   ├── services/
│   │   │   ├── llm_service.py      # LiteLLM wrapper, chat_with_session(), multi-provider support
│   │   │   └── categorization_service.py # Transaction categorization logic
│   │   └── ml_models/              # Pre-trained models (Word2Vec, RandomForest)
│   ├── scripts/                    # Utility scripts
│   │   ├── seed.py                 # Populate test data
│   │   ├── clear_db.py             # Reset database
│   │   └── seed_test_users.py      # Create test users
│   ├── tests/                      # Test files
│   │   ├── test_llm.py
│   │   ├── test_tool_calling.py
│   │   └── ...
│   ├── migrations/                 # Alembic DB schema versions
│   ├── instance/                   # Runtime data (pixie.db for local dev)
│   ├── run.py                      # Server entry: `uv run run.py`
│   ├── requirements.txt            # Python dependencies (Flask, SQLAlchemy, LiteLLM, gunicorn, etc.)
│   ├── config.py                   # Database + JWT config (from env or defaults)
│   └── README.md
├── docs/                           # Project documentation
│   ├── AGENTS.md                   # Real-time status, blockers, next tasks
│   ├── agent.md                    # Quick reference for agents
│   ├── personality_prompts.md      # LLM persona prompts
│   ├── contract.json               # API contract definitions
│   └── enums.json                  # Enum definitions
├── model/                          # ML classifier notebook & data (separate project)
├── README.md                       # Project overview, setup instructions
└── .github/instructions/           # Detailed instructions (frontend.md, backend.md)
```

## Key Documentation
- **This file** — High-level architecture, commands, patterns, gotchas
- **`.github/instructions/frontend.instructions.md`** — Frontend-specific patterns, screen creation, state management
- **`.github/instructions/backend.instructions.md`** — Backend API design, model patterns, LLM service details
- **`docs/AGENTS.md`** — Project status, blockers, recent changes, next priorities
- **`docs/agent.md`** — Quick reference for agents
- **`README.md`** — User-facing overview, setup instructions (Docker + manual)
- **Backend `README.md`** — Detailed backend setup, migration docs

## Error Handling Patterns

**Frontend**:
```javascript
try {
  const data = await apiRequest("/api/endpoint");
  // Use data
} catch (error) {
  console.error("Request failed:", error);
  showErrorUI("Something went wrong. Please try again.");
}
```

**Backend**:
```python
try:
    result = some_operation()
    return jsonify(result=result), 200
except ValueError as e:
    return jsonify(error=str(e)), 400
except Exception as e:
    current_app.logger.error(str(e))
    return jsonify(error="Internal server error"), 500
```

**Auth Failures**: 401 responses trigger `checkAuthAndRedirect()` in frontend, redirecting user to login.

## Pre-Submit Checklist

1. ✅ **Frontend Changes**: Run `npm run build` to test build succeeds
2. ✅ **Backend Changes**: If models changed, run `uv run flask db migrate -m "description"` + `uv run flask db upgrade`
3. ✅ **Manual Testing**: Test feature end-to-end with both servers running
4. ✅ **URL Navigation**: New screens use `navigate()` to ensure back button works
5. ✅ **API Integration**: Verify frontend calls via `api.js`, backend returns consistent JSON shape
6. ✅ **Console/Logs**: Check browser console (F12) and backend terminal for errors
7. ✅ **Documentation**: Update instruction files per maintenance protocol below

## Documentation Maintenance Protocol

**When to Update Documentation:**
- After implementing significant features (new screens, API endpoints, tool calling changes)
- After architectural changes (consolidating screens, refactoring patterns)
- After bugfixes that affect gotchas or known issues
- When clarifying patterns that caused confusion during development

**Which Files to Update (in order):**
1. **docs/AGENTS.md** — Update "Recently Completed" section, move tasks between "In Progress" and "Next Priority"
2. **docs/agent.md** — Update "Current Features" and "Known Issues & Workarounds" sections
3. **.github/copilot-instructions.md** — Update project status, add/remove gotchas, update patterns if changed
4. **.github/instructions/backend.instructions.md** — Only update if backend patterns/conventions changed
5. **.github/instructions/frontend.instructions.md** — Only update if frontend patterns/conventions changed

**How to Update:**
- Use clear, actionable language
- Include specific file paths and line numbers when referencing code
- Keep sections concise but complete
- Cross-reference related sections
- Always include timestamps/session dates for context

**Critical Rule:**
Never let documentation fall out of sync. Spend 5 minutes updating docs after each session so the next agent can hit the ground running.

---

**Last Updated**: January 27, 2026  
**Authority**: Primary source of truth for Pixie development. Use alongside `docs/AGENTS.md` for current status and `docs/agent.md` for quick reference.
