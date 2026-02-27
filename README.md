# AnswerScope AI (Full Stack)

AnswerScope AI is a full-stack AI visibility analysis platform:
- `frontend/`: Next.js dashboard and workflows for onboarding, analysis, and reporting.
- `backend/`: Flask API for auth, brand profiles, async analysis, dashboards, and PDF export.

## Repository Structure

```text
.
|-- app.py
|-- requirements.txt
|-- start-app.bat
|-- backend/
|-- frontend/
|-- docs/
|-- .env.example
`-- .github/workflows/ci.yml
```

## Prerequisites

- Python 3.10+
- Node.js 20+
- npm 10+
- Playwright browser binaries for backend scraping:
  - `python -m playwright install chromium`

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Set required values:
   - `FLASK_SECRET_KEY`
   - `GOOGLE_API_KEY` or `GEMINI_API_KEY`
3. Optional:
   - `SERPAPI_KEY`
   - `SERPAPI_MOCK=1` for deterministic local runs without live SerpApi calls.

## Local Run

### Option A: launcher

```bat
start-app.bat
```

### Option B: manual

Backend:

```bash
python -m pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

App URLs:
- Frontend: `http://127.0.0.1:3001`
- Backend API: `http://127.0.0.1:5000`

## Validation

Backend:

```bash
python -m compileall -q app.py backend
```

Frontend:

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs:
- Backend compile/import checks
- Frontend lint, typecheck, unit tests, and build

## Documentation

- [Setup Guide](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Complete Project Dossier](docs/PROJECT_CONTEXT_DOSSIER.md)

## Intentionally Excluded From Git

- Secrets and local env files (`.env`)
- Runtime data (`backend/database.db`, `backend/flask_session/`)
- Generated static assets (`backend/static/profile/`, `backend/static/screenshots/`)
- Local extra artifacts (`extra/`)
- Frontend build/dependency caches (`frontend/node_modules/`, `frontend/.next/`)
- E2E/demo artifacts (`frontend/e2e/`, `frontend/artifacts/`)
