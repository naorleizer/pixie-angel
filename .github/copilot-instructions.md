# GitHub Copilot Instructions for Pixie

You are an expert AI programming assistant working on **Pixie**, an AI-powered financial guardian angel application.

## Project Overview
- **Type**: Full-stack Web Application
- **Frontend**: Vanilla JavaScript (ES Modules), Vite, Tailwind CSS
- **Backend**: Python Flask, SQLAlchemy, LiteLLM (Gemini Flash 2.0)
- **Database**: SQLite (Development), PostgreSQL (Production ready)
- **Current Status**: Production-ready mockup with real authentication & chat; challenges/transactions partially implemented

## Tech Stack & Conventions

### Frontend (`frontend/src/`)
- **Architecture**: No framework (Vanilla JS). Screens stored in `src/screens/*.html` and injected by `src/main.js` using Vite's `?raw` import
- **State Management**: Simple global state object in `src/state.js` (not Redux)
- **API**: All backend communication **MUST** go through `src/api.js`. Never use `fetch()` directly in components
- **Navigation**: Use `navigate(screenName)` from `src/navigation.js` for URL-aware screen switching (supports back button via browser history)
- **Auth**: JWT stored in `localStorage` key `pixie_auth_token`
- **Styling**: Tailwind CSS utility classes; avoid custom CSS in `styles.css` unless animations needed
- **Naming**: camelCase for functions, kebab-case for IDs/classes

### Backend (`backend/app/`)
- **Framework**: Flask (Application Factory pattern in `app/__init__.py`)
- **Routes**: All endpoints defined in `app/routes/api.py` (organized, not scattered)
- **ORM**: SQLAlchemy. Models in `app/models/` (user.py, challenge.py, chat.py, transaction.py, etc)
- **LLM**: `app/services/llm_service.py` handles all LiteLLM/Gemini interactions
- **Auth**: All protected endpoints require `@jwt_required()` decorator (except login/register)
- **Response Format**: Always return JSON as `{ "key": value }`. Frontend reads properties like `.response`, `.content`, etc
- **Package Manager**: `uv` (preferred) or standard `pip`
- **Naming**: snake_case for functions/variables, PascalCase for classes

## Common Commands

| Task | Command | Location |
|------|---------|----------|
| Start frontend dev server | `npm run dev` | `frontend/` |
| Start backend API server | `uv run run.py` | `backend/` |
| Run DB migration | `uv run flask db upgrade` | `backend/` |
| Seed mock data | `uv run seed.py` | `backend/` |
| Clear database | `uv run clear_db.py` | `backend/` |
| Lint frontend | `npm run lint` | `frontend/` |

## Critical Patterns

### Frontend: Making API Calls
```javascript
// ✅ CORRECT: Use api.js wrapper
import { apiRequest } from "./api.js";
const response = await apiRequest("/api/challenges");

// ❌ WRONG: Never fetch directly
const response = await fetch("/api/challenges");
```

### Frontend: Screen Navigation with URL Sync
```javascript
// ✅ CORRECT: Use navigate() to update URL and show screen
import { navigate } from "./navigation.js";
navigate("chat");  // Updates URL to #/chat and shows screen

// ❌ WRONG: Direct showScreen() doesn't update URL (breaks back button)
showScreen("screen-chat", true);
```

### Backend: Protected Endpoints
```python
# ✅ CORRECT: Protected route with JWT
@api_bp.route('/challenges', methods=['GET'])
@jwt_required()
def get_challenges():
    user_id = get_jwt_identity()
    challenges = Challenge.query.filter_by(user_id=user_id).all()
    return jsonify(challenges=[c.to_dict() for c in challenges])

# ❌ WRONG: Missing @jwt_required()
@api_bp.route('/challenges', methods=['GET'])
def get_challenges():
    ...
```

## Known Gotchas to Avoid

1. **Frontend Architecture**: `index.html` is just a shell. All screens loaded dynamically from `src/screens/*.html`. Never assume screens are pre-rendered in the HTML.

2. **Chat Response Format**: Backend returns `{ "response": "text" }`. Frontend must read `.response`, not `.content` or other keys.

3. **URL Routing for Back Button**: Use `navigate()` not `showScreen()` in UI handlers. Recent fix: both chat and challenge forms now properly update the URL hash.

4. **Auth Token Handling**: Always check `localStorage.pixie_auth_token` exists before making authenticated requests. Expired tokens cause 401 errors.

5. **Sidebar Context**: The sidebar menu is injected in `main.js` and persists across screens. Chat sessions loaded via `/api/chat/sessions`. If you change chat routes, update the sidebar loader.

6. **Challenge State**: Currently using mock data in `src/state.js`. Real API at `/api/challenges` (POST/GET/PUT/DELETE) exists but frontend still uses mockups for carousel display.

7. **CORS**: Backend configured for `http://localhost:5173` (frontend dev server). If changing ports, update `config.py`.

## File Structure Reference

```
mockup/
├── frontend/
│   ├── src/
│   │   ├── screens/           # HTML templates (login.html, dashboard.html, chat.html, etc)
│   │   ├── main.js            # App entry point, screen injection
│   │   ├── navigation.js       # Screen routing with URL sync & back button
│   │   ├── api.js             # Backend API client wrapper
│   │   ├── chat.js            # Chat UI logic & message handling
│   │   ├── dashboard.js       # Dashboard carousel & challenge display
│   │   ├── challenge.js       # Challenge creation (currently mock)
│   │   ├── auth.js            # Login/register logic
│   │   ├── state.js           # Global app state
│   │   └── ...
│   ├── index.html             # Shell only
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── __init__.py        # Flask factory
│   │   ├── routes/
│   │   │   ├── api.py         # Main API endpoints
│   │   │   └── auth.py        # Auth endpoints (login, register)
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── challenge.py
│   │   │   ├── chat.py
│   │   │   └── transaction.py
│   │   ├── services/
│   │   │   ├── llm_service.py # Gemini integration
│   │   │   └── categorization_service.py
│   │   └── ml_models/         # ML categorization (unused for now)
│   ├── migrations/            # Alembic DB migrations
│   ├── run.py                 # Server entry point
│   ├── config.py              # Configuration
│   ├── requirements.txt        # Python dependencies
│   └── README.md
└── README.md
```

## Documentation Files
- **`.github/copilot-instructions.md`** (this file) — High-level conventions & architecture
- **`.github/instructions/frontend.instructions.md`** — Frontend-specific patterns & state management
- **`.github/instructions/backend.instructions.md`** — Backend-specific API design & LLM service details
- **`AGENTS.md`** — Real-time project status, blockers, next tasks, known issues
- **`README.md`** — User-facing project overview

## Error Handling

- **Frontend**: Always wrap async/await in try/catch blocks. Log to console for debugging
- **Backend**: Return HTTP error codes (400, 401, 404, 500) with descriptive JSON error messages
- **Auth**: 401 responses trigger `checkAuthAndRedirect()` in frontend, redirecting to login

## Before You Submit Code

1. ✅ Frontend: Run `npm run lint` for ESLint checks
2. ✅ Backend: Run migrations if you changed models (`uv run flask db migrate && uv run flask db upgrade`)
3. ✅ Test: Manually test the feature in both browsers and check console/backend logs
4. ✅ URL Sync: If you added a new screen, use `navigate()` to ensure back button works
5. ✅ Docs: Update AGENTS.md if you changed architecture or added blockers
6. ✅ API Contract: If adding a new endpoint, verify frontend can call it via `api.js` wrapper

---

**Last Updated**: January 12, 2026  
**Authority**: This file is the source of truth for Pixie conventions. Trust it first; search second.
