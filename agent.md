# Agent Context & Handoff

This file serves as a quick-start context dump for AI agents working on the Pixie project.

## 1. Architecture Map
```mermaid
graph TD
    Client[Frontend (Vite/JS)] <-->|JSON/JWT| API[Backend API (Flask)]
    API <-->|SQLAlchemy| DB[(SQLite/Postgres)]
    API <-->|LiteLLM| AI[Gemini Flash 2.0]
```

## 2. Key File Locations
| Component | Path | Description |
|-----------|------|-------------|
| **Routes** | `backend/app/routes/api.py` | Main API endpoints (Chat, Auth). |
| **Models** | `backend/app/models/` | DB Schemas (User, ChatSession, etc). |
| **LLM** | `backend/app/services/llm_service.py` | AI logic & prompt engineering. |
| **API Client** | `frontend/src/api.js` | Frontend fetch wrappers. |
| **Chat UI** | `frontend/src/chat.js` | Chat logic & DOM manipulation. |
| **Screens** | `frontend/src/screens/` | HTML partials for each view (Login, Dashboard, etc). |
| **Auth UI** | `frontend/src/auth.js` | Login form handling. |
| **Entry** | `frontend/src/main.js` | App initialization. |

## 3. Immediate Task List (Next Agent)
The immediate goal is to move "Challenges" from mockup to reality.

1.  **Backend**:
    *   Create `Challenge` model in `backend/app/models/challenge.py`.
    *   Fields: `id`, `user_id`, `title`, `target_amount`, `current_amount`, `deadline`, `type`.
    *   Add routes in `api.py`: `POST /challenges`, `GET /challenges`.

2.  **Frontend**:
    *   Update `api.js` with `createChallenge`, `getChallenges`.
    *   Refactor `challenge.js` to use these API calls instead of `state.js` dummy data.
    *   Update `dashboard.js` to render challenges from the API response.

## 4. Known Issues / Gotchas
- **Frontend Architecture**: `index.html` is a shell. Screens are loaded from `frontend/src/screens/*.html` via `main.js` using Vite's `?raw` import.
- **Chat Response Format**: The backend returns `{ "response": "..." }`. Ensure frontend uses `.response` property, not `.content`.
- **Auth Token**: Stored in `localStorage` key `pixie_auth_token`.
- **Dev Environment**: Backend runs on port 35000. Frontend proxies or calls directly (CORS enabled).

## 5. Maintenance Protocol
- **Update Documentation**: After every major feature implementation or architectural change, you MUST update `agent.md` and `.github/copilot-instructions.md`.
- **Status Tracking**: Move completed items from "Immediate Task List" to a "Completed" section or remove them.
- **Context Handoff**: Ensure `agent.md` always reflects the *current* state of the project for the next agent.
