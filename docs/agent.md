# Agent Context & Handoff

This file serves as a quick-start context dump for AI agents working on the Pixie project. For comprehensive status, see `AGENTS.md`. For coding patterns, see `.github/copilot-instructions.md`.

## 1. Architecture Map
```mermaid
graph TD
    Client[Frontend (Vite/JS)] <-->|JSON/JWT| API[Backend API (Flask)]
    API <-->|SQLAlchemy| DB[(SQLite/Postgres)]
    API <-->|LiteLLM| AI[Multi-Provider LLM<br/>Gemini/OpenAI/Anthropic]
    API <-->|ML Pipeline| Categorizer[Transaction Categorizer<br/>Heuristic→ML→LLM]
```

## 2. Key File Locations
| Component | Path | Description |
|-----------|------|-------------|
| **Routes** | `backend/app/routes/api.py` | All API endpoints (Chat, Auth, Challenges, Transactions). |
| **Models** | `backend/app/models/` | DB Schemas (User, ChatSession, Challenge, ChallengeUpdate, Transaction, etc). |
| **LLM** | `backend/app/services/llm_service.py` | LiteLLM wrapper, tool registry, multi-provider support. |
| **Tools** | `backend/app/services/` | calculator_service.py, challenge_manager_service.py, transaction_history_service.py |
| **Categorization** | `backend/app/services/categorization_service.py` | Waterfall pipeline (heuristic → ML → LLM) for transaction categorization. |
| **API Client** | `frontend/src/api.js` | All backend fetch wrappers; JWT token injection & error handling. |
| **Navigation** | `frontend/src/navigation.js` | Screen routing with URL sync & back button support. |
| **Screens** | `frontend/src/screens/` | HTML templates (one per view): dashboard.html, chat.html, challenges.html, account-settings.html, etc. |
| **Chat UI** | `frontend/src/chat.js` | Chat logic, message rendering, demo flow. |
| **Dashboard** | `frontend/src/dashboard.js` | Dashboard carousel, challenge cards, transactions widget, detail modal. |
| **Entry** | `frontend/src/main.js` | App initialization, screen injection, event setup. |
| **Scripts** | `backend/scripts/` | Utility scripts: seed.py, clear_db.py, seed_test_users.py |
| **Tests** | `backend/tests/` | Test files: test_tool_calling.py, test_calculator.py, etc. |
| **Docker** | Root: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | Full containerization |

## 3. Current Features (Jan 27, 2026)

### ✅ Fully Implemented & Tested
- **Docker Deployment**: Full containerization with PostgreSQL, Flask+gunicorn, nginx
- **Multi-Provider LLM**: LiteLLM supports Google AI Studio, Vertex AI, OpenAI, Anthropic, Azure
- **User Authentication**: Login/register via JWT tokens
- **Chat with AI**: LLM integration with 3 tools (calculator, challenge_manager, transaction_history); proactive tool usage; comprehensive logging
- **Challenges**: Create, update (add updates), soft-delete, restore, purge; status computed; filtering (current/past/all); real-time dashboard refresh
- **Transactions**: Import CSV with waterfall categorization (heuristic→ML→LLM); display with filtering; manual category correction
- **Account Settings**: Consolidated "Privacy & Data" + "Account Management" into single `account-settings` screen; interests/motivations/persona selection
- **Dashboard**: Real-time challenges widget, transaction list, balance widget
- **Merchant Data**: Standardized to realistic US merchants (WINDSTREAM, PHONE COMPANY, TAXI - USA, etc.)

### 🔧 Ready for Enhancement
- Chat: Could add more tools or refine system prompt further
- Challenges: Could add collaborative features, recurring challenges
- Transactions: Could add budgeting features, spending insights
- UI: Could add dark mode, mobile optimizations

## 4. Just-Changed Critical Things (Jan 27 Session)
1. **Docker Compose**: Full containerization with PostgreSQL, Flask+gunicorn, nginx
2. **Repo Reorganization**: Moved docs to `docs/`, scripts to `backend/scripts/`, tests to `backend/tests/`
3. **Multi-Provider LLM**: `LLM_MODEL` env var supports provider prefixes (e.g., `gemini/gemini-2.0-flash`)
4. **Static Assets**: Moved to `frontend/public/assets/` for proper Vite handling
5. **PostgreSQL Compatibility**: Boolean defaults use `sa.text('FALSE')` not `'0'`
6. **Password Hash**: Column increased from 128 to 256 chars for Werkzeug scrypt

## 5. Environment Variables
```bash
# Backend (.env in backend/)
GEMINI_API_KEY=<your-gemini-api-key>      # For Google AI Studio
# Or OPENAI_API_KEY, ANTHROPIC_API_KEY for other providers
JWT_SECRET_KEY=<your-jwt-secret>
DATABASE_URL=sqlite:///instance/pixie.db  # Local dev
# DATABASE_URL=postgresql://... for Docker/prod
LLM_MODEL=gemini/gemini-2.0-flash         # Include provider prefix!
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1000
```

## 6. Common Commands

| Task | Command | Notes |
|------|---------|-------|
| **Docker start** | `docker compose up --build -d` | Full stack at localhost:8080 |
| **Docker logs** | `docker compose logs -f backend` | Watch backend output |
| **Docker stop** | `docker compose down` | Stop all containers |
| **Docker reset** | `docker compose down -v` | Stop + delete database |
| **Run frontend** | `npm run dev` (in `frontend/`) | http://localhost:5173; HMR enabled |
| **Run backend** | `uv run run.py` (in `backend/`) | http://localhost:35000; restart on changes |
| **Migrate DB** | `uv run flask db migrate -m "msg"` | Create migration after model changes |
| **Apply migrations** | `uv run flask db upgrade` | Apply pending migrations |
| **Seed test data** | `uv run scripts/seed.py` | Demo users, chats, challenges, transactions |
| **Reset DB** | `uv run scripts/clear_db.py` | Wipe all data (dev only) |

## 7. Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| LLM fails with "No module named google" | Ensure `LLM_MODEL` has provider prefix: `gemini/gemini-2.0-flash` |
| PostgreSQL boolean migration fails | Use `sa.text('FALSE')` not `sa.text('0')` for server_default |
| Static assets not loading in Docker | Assets must be in `public/assets/` for Vite to copy |
| Dashboard doesn't load on first entry | Fixed: `resetTo()` now calls `initScreenHandlers()` |
| Chat claims no access to transactions | Fixed: System prompt now has explicit accessibility statement |

## 8. Before Editing Code
1. **Read the relevant instruction file**: 
   - Backend work? Read `.github/instructions/backend.instructions.md`
   - Frontend work? Read `.github/instructions/frontend.instructions.md`
   - General patterns? Read `.github/copilot-instructions.md`
2. **Check AGENTS.md** for current blockers or recent changes
3. **Test your changes** with both dev servers running
4. **Update documentation** if you change architecture or add major features

## 9. Quick Navigation
- **Status**: See `docs/AGENTS.md` for detailed current state, blockers, next tasks
- **Patterns**: See `.github/copilot-instructions.md` for coding conventions
- **Backend Details**: See `.github/instructions/backend.instructions.md` for Flask/DB patterns
- **Frontend Details**: See `.github/instructions/frontend.instructions.md` for JS/screen patterns
- **How to Update These Files**: See maintenance guidelines in `.github/copilot-instructions.md`

## 10. Maintenance Protocol
**After completing any significant work:**
1. Update `AGENTS.md` with newly completed items and current blockers
2. Update relevant instruction file (backend.instructions.md or frontend.instructions.md) if patterns changed
3. Update `.github/copilot-instructions.md` if architecture or overall approach changed
4. **Never let these docs fall out of sync** — they're the source of truth for future agents

---

**Last Updated**: January 24, 2026  
**Authority**: Source of truth for quick context. See AGENTS.md for comprehensive status.

