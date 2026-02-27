# Architecture

## High-Level Flow

1. User authenticates and creates/updates brand profile in frontend.
2. Frontend calls Flask API through Next.js rewrite (`/api/*` -> backend).
3. Backend analysis pipeline:
   - Fetches search context (SerpApi or fallback)
   - Scrapes target page with Playwright
   - Normalizes AI output into stable report schema
   - Calculates LAS and Citation Authority
4. Results are stored in SQLite and exposed through dashboard endpoints.
5. Frontend dashboards render trends, history, scan results, and PDF export.

## Components

### Frontend (`frontend/`)

- Next.js App Router
- React Query API hooks
- Route groups:
  - `(auth)` login/register
  - `(protected)` dashboard/onboarding/results/profile
- API client normalizes backend error envelopes into a single frontend error type.

### Backend (`backend/` + `app.py`)

- Flask blueprints:
  - `auth_routes.py`
  - `brand_routes.py`
  - `analysis_routes.py`
  - `dashboard_routes.py`
- Service modules:
  - `analysis.py` orchestrates search + scraping + AI analysis
  - `ai_engine.py` builds prompts, normalizes model output
  - `database.py` manages schema/init/connect

## Data Layer

SQLite (`backend/database.db`) with core entities:
- `users`
- `brand_profiles`
- `scan_results`
- `analysis_jobs`
- `scan_run_events`
- `scan_metrics`
- `scan_citations`
- `prompt_observations`

## Async Analysis Lifecycle

1. `POST /api/run-analysis-async`
2. Job inserted into `analysis_jobs` with `queued` status.
3. Background worker stages:
   - `capturing_screenshot`
   - `analyzing`
   - `completed` or `failed`
4. Client polls `GET /api/analysis-status/<job_id>`.
5. On completion, scan artifacts are persisted and result payload is returned.
