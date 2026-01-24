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

## Current Project Status (Jan 24, 2026)

### ✅ Recently Completed (Jan 24 Session - Chat & Dashboard UX Polish)
- **LLM Service Logging**: Added comprehensive logging throughout tool-calling pipeline to diagnose response building issues
- **Debug Output Removal**: Eliminated `last_tool_success_message` fallback that was leaking tool execution output to user responses
- **Safeguard Response**: Implemented clean fallback response instead of tool artifacts when iteration limit reached
- **Merchant Data Standardization**: Replaced 64 Israeli merchant names with realistic test data (WINDSTREAM, PHONE COMPANY, TAXI - USA, etc.)
- **Dashboard Transaction Loading Fix**: Fixed `resetTo()` function in navigation.js to call `initScreenHandlers()` so dashboard loads data on first entry
- **Chat Proactive Tool Usage**: Rewrote system prompt with explicit accessibility statement ("You have FULL ACCESS to user's financial data through these tools")
- **LLM Tool Calling Robustness**: Added strong directives for proactive tool usage with red emoji warnings and concrete examples
- **Account Settings Screen Consolidation**: Combined "Privacy and Data" + "Account Management" screens into single unified `account-settings.html`
- **Profile Menu Simplified**: Replaced two separate buttons with single "Settings" button linking to combined account-settings screen
- **Challenge Widget Real-time Update**: Fixed dashboard challenges carousel to refresh immediately after challenge updates via `handleAddUpdate()` in challenges.js
- **Navigation Handler Unified**: Added `screen-account-settings` handler combining initialization from both privacy and account management screens

### ✅ Previously Completed (Jan 17 Session - Challenge Updates Feature)
- **Challenge Updates Model**: Created `ChallengeUpdate` table with signed amounts, descriptions, timestamps
- **Computed Challenge Status**: Added `compute_current_amount()`, `compute_status()`, `get_progress_status()` methods
- **Status Logic**: Active (before end_date), Completed/Failed (after end_date based on target achievement)
- **Challenge API Enhanced**: 
  - `GET /api/challenges?filter=current|past|all` with date-based filtering
  - `GET /api/challenges/<id>` returns challenge with updates history
  - `POST /api/challenges/<id>/updates` adds update and recalculates status
- **Challenges List Screen**: New `challenges.html` with Current/Past/All filter tabs, card grid, detail modal
- **Challenge Detail View**: Shows status badges, colored amounts with arrows (↑ green, ↓ red), updates timeline (newest first), add-update form
- **Dashboard Integration**: "View All Challenges" button, clickable cards navigate to detail view
- **Status-Aware UI**: On Track/Below Target badges for active, Completed/Failed for past challenges
- **Navigation Wiring**: Added "All Challenges" to sidebar, screen routing in navigation.js

### ✅ Previously Completed (Jan 12 Session - Part 2)
- **Transaction Title Fix**: Fixed null/empty titles; backend priority: merchant_name > description > transaction_type > date
- **Manual Category Corrections**: PATCH /api/transactions/<id> endpoint with logging
- **Transaction UI Redesign**: 2-row compact layout (Date/Description/Category + Account/Metadata/Amount)
- **Account/Card Info Display**: Shows account_name, card_last_4, merchant country, recurring indicator
- **Recent Transactions Widget**: Dashboard now shows 5 most recent transactions with real API calls
- **UI Compacting**: Reduced padding (py-2 → py-1), optimized border styling for mobile

### ✅ Previously Completed (Jan 12 Session - Part 1)
- **ML Model Integration**: Loaded pre-trained RandomForest classifier from classifier.ipynb
- **Waterfall Categorization**: Implemented three-stage pipeline (heuristic → ML → LLM) with confidence scoring
- **Transaction Model Updated**: Added `categorization_confidence` (0.0-1.0) and `categorization_source` (heuristic/ml/llm/manual) fields
- **CSV Import Enhanced**: New format support (balance_after, transaction_type, merchant_country, is_recurring) with waterfall categorization
- **LLM Failure Handling**: Graceful degradation with logging (items marked category=None on LLM failure, partial import succeeds)
- **Account Model**: Normalization of financial accounts with composite key matching

### 🚧 In Progress / Blockers
- None currently - all recent features are complete and tested

### 📋 Next Priority Tasks
1. **End-to-End Testing**: Full workflow test - login → dashboard → create challenge → add update → view in all challenges screen → return to dashboard (verify real-time update)
2. **Chat Tool Usage Validation**: Verify tools are called proactively on first message (transaction_history for spending questions, challenge_manager for goal questions)
3. **Settings Screen Cross-Browser**: Verify account-settings screen loads and saves correctly on mobile and desktop
4. **Performance Monitoring**: Monitor LLM logging output for response building patterns (check backend logs for any safeguard fallback usage)
5. **Data Quality Verification**: Confirm merchant standardization is reflected accurately in transaction lists and categorization
6. **Navigation Edge Cases**: Test back button behavior with new unified settings screen


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

**ML Model Setup** (REQUIRED before first CSV import):
```bash
# 1. Train the classifier (if not already done)
cd model
jupyter notebook classifier.ipynb
# Run all cells - this saves artifacts to backend/app/ml_models/

# 2. Verify artifacts exist:
# - backend/app/ml_models/transaction_classifier.pkl (the model)
# - backend/app/ml_models/categories.json (category definitions)
# - backend/app/ml_models/model_metadata.json (training info)
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
| **Train ML model** | `jupyter notebook model/classifier.ipynb` | Generates artifacts in backend/app/ml_models/ |

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
                                        ├── transaction.py
                                        └── account.py
```

## Transaction Categorization Pipeline (Waterfall)

```
CSV Import
  ↓
For each transaction:
  ├─ Stage 1: Heuristic (transaction_type hints)
  │   └─ Match: salary→Income, bill_payment→Bills & Utilities, etc.
  ├─ Stage 2: Heuristic (merchant name + MCC keywords)
  │   └─ Match: keywords in categories.json
  ├─ Stage 3: ML Model (RandomForest)
  │   └─ If confidence >= 0.7: categorize, else defer
  └─ Stage 4: LLM Batch (Gemini API)
      └─ Called once at end of import for all uncategorized items
      └─ On failure: mark category=None, log error, continue

Result: (category, confidence, source) stored in Transaction model
- source: 'heuristic' | 'ml' | 'llm' | None
- confidence: 0.0-1.0 (1.0 for heuristic, varies for ML/LLM)
```

---

## Critical Files for New Agents

| File | Why It Matters |
|------|----------------|
| `frontend/src/main.js` | App initialization, screen injection, event setup |
| `frontend/src/navigation.js` | Screen routing & URL sync (back button support) |
| `frontend/src/api.js` | All backend communication; auth token handling |
| `backend/app/__init__.py` | Flask factory, CORS setup, error handlers |
| `backend/app/routes/api.py` | All API endpoints (GET/POST/PUT/DELETE) |
| `backend/app/models/` | Database schemas (User, ChatSession, Transaction, etc) |
| `backend/app/services/categorization_service.py` | Waterfall categorization pipeline (heuristic→ML→LLM) |
| `backend/app/services/llm_service.py` | LiteLLM wrapper for Gemini API |
| `.github/copilot-instructions.md` | High-level rules & conventions |
| `.github/instructions/frontend.instructions.md` | Frontend-specific patterns |
| `.github/instructions/backend.instructions.md` | Backend-specific patterns |
| `PARTIALLY_IMPLEMENTED.md` | Tracks incomplete code pieces & status |

---

## Known Gotchas

1. **Frontend Architecture**: No build output committed. `index.html` is a shell; actual screens injected at runtime via `main.js`.
2. **Chat Response Format**: Backend returns `{ "response": "..." }`. Frontend reads `.response` not `.content`.
3. **Auth Token**: Stored in `localStorage` key `pixie_auth_token`. Must be sent in every protected request header.
4. **CORS**: Backend allows localhost:5173 (frontend). If proxying, update config.
5. **Sidebar Integration**: Chats loaded from `/api/chat/sessions`, displayed in left sidebar (needs to be updated if chat API changes).
6. **Challenge Widget Refresh**: Dashboard challenges carousel auto-refreshes when updated from challenges detail screen via `loadChallenges()` call.
7. **LLM Tool Calling**: All 3 tools (calculator, challenge_manager, transaction_history) are passed on every message. System prompt has explicit directive for proactive tool usage.
8. **Debug Output Prevention**: Tool execution artifacts are NOT passed to users; safeguard response used if iteration limit reached without proper LLM response.
9. **Settings Screen Consolidation**: Old `screen-privacy` and `screen-account-management` still exist in HTML but are no longer used. New `screen-account-settings` combines both with unified initialization logic.

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
