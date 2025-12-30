# GitHub Copilot Instructions

You are an expert AI programming assistant working on the "Pixie" project.
This file provides context and rules for working on this specific codebase.

## Project Overview
Pixie is an AI-powered financial guardian angel application.
- **Type**: Full-stack Web Application.
- **Frontend**: Vanilla JavaScript (ES Modules), Vite, Tailwind CSS.
- **Backend**: Python Flask, SQLAlchemy, LiteLLM (Gemini).
- **Database**: SQLite (Dev), PostgreSQL (Prod ready).

## Tech Stack & Conventions

### Frontend (`/frontend`)
- **Framework**: No framework (Vanilla JS). Uses ES Modules.
- **Architecture**: "HTML-in-JS". Screens are stored in `src/screens/*.html` and injected by `src/main.js`.
- **Styling**: Tailwind CSS.
- **State Management**: Simple global state object in `src/state.js`.
- **API**: All backend communication MUST go through `src/api.js`.
  - Do not use `fetch` directly in components; use `apiRequest` or specific wrapper functions.
- **Auth**: JWT stored in `localStorage`.
- **Navigation**: `src/navigation.js` handles screen switching (SPA feel).

### Backend (`/backend`)
- **Framework**: Flask (Factory Pattern in `app/__init__.py`).
- **Blueprints**: Routes defined in `app/routes/api.py`.
- **ORM**: SQLAlchemy. Models in `app/models/`.
- **AI**: `app/services/llm_service.py` handles LiteLLM/Gemini interactions.
- **Environment**: Managed via `uv` (Python package manager).

## Current Development Status (Dec 30, 2025)

### ✅ Completed Features
- **Authentication**: Login/Register flows working. JWT protection enabled.
- **Chat System**:
  - Real-time chat with Gemini.
  - Chat history persistence (Sessions/Messages).
  - Auto-titling of chat sessions.
  - Chat History UI.

### 🚧 Pending / In-Progress
- **Challenges**:
  - Frontend (`challenge.js`) is currently MOCKUP ONLY.
  - Needs Backend API (`/challenges` CRUD).
  - Needs Frontend integration to replace dummy data.
- **Transactions**:
  - API exists (`GET /transactions`).
  - Frontend client exists.
  - UI needs to be implemented/connected.

## Coding Rules
1.  **Preserve Context**: When editing `index.html`, be careful not to break existing `id` references used by JS.
2.  **Tailwind**: Use utility classes for styling. Avoid custom CSS in `styles.css` unless necessary for animations.
3.  **Error Handling**: Always wrap async/await in try/catch blocks in the frontend.
4.  **Backend**: Ensure all new endpoints are protected with `@jwt_required()` unless public (like login).
5.  **Documentation**: ALWAYS update `.github/copilot-instructions.md` and `agent.md` after completing major features or changing architecture. Keep the "Current Status" and "Pending" sections up to date.

## Common Commands
- **Frontend**: `npm run dev` (in `/frontend`)
- **Backend**: `uv run run.py` (in `/backend`)
