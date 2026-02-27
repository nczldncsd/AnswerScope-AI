# AnswerScope AI
## Complete Project Context and Requirements Analysis Dossier

Document version: 1.0  
Last updated: 2026-02-27  
Repository scope: Full stack monorepo (`backend` + `frontend`)  
Primary audience: New developers, evaluators, maintainers, and AI assistants that need full project context.

---

## 1. Purpose of This Document

This dossier is a single-source, end-to-end context file for the AnswerScope AI project. It is intentionally detailed so a new engineer or an AI system can understand:

- Why the project exists.
- What business and technical problem it solves.
- How the system is structured.
- How data flows through the platform.
- How to run, validate, and extend it.
- What constraints and risks currently exist.

If this file is pasted into an AI system, it should provide enough context to perform meaningful code analysis, debugging, documentation updates, feature planning, and implementation proposals without requiring deep initial repository exploration.

---

## 2. Executive Summary

AnswerScope AI is an AI visibility intelligence platform that helps a brand evaluate how well it appears in AI/search answer ecosystems and what actions can improve those outcomes.

Core platform capabilities:

- User authentication and session management.
- Brand profile onboarding (brand name, website, category, competitors).
- Keyword + URL based analysis pipeline.
- Async scan execution with status polling.
- Dashboard analytics (history, stats, trends, insights, citation breakdown).
- Export of scan reports as structured PDFs.

The product combines:

- Search context ingestion (SerpApi or mock/fallback).
- Target page scraping (Playwright).
- LLM-based analysis normalization (Gemini via `google-genai`).
- Metric persistence into SQLite.
- UI orchestration in a Next.js dashboard.

---

## 3. Product Vision and Problem Statement

### 3.1 Problem Being Solved

Brands increasingly need to understand visibility in AI-generated responses, not only in traditional search rankings. Standard SEO tools do not fully map AI answer relevance, citation authority, and response sentiment into one operational workflow.

### 3.2 Vision

Provide a practical workflow where a user can:

1. Define brand context once.
2. Run repeatable scans for specific keyword/URL pairs.
3. Receive normalized, action-oriented outputs.
4. Track progress over time using stored metrics and trend endpoints.

### 3.3 Intended Outcome

Users get a decision-ready dashboard and a report export that translate analysis artifacts into actionable recommendations.

---

## 4. Requirements Analysis

## 4.1 Functional Requirements (Current Implementation)

FR-1 Authentication and session identity:
- Register, login, logout, and session identity retrieval.
- Session-backed auth for protected API routes.

FR-2 Profile management:
- Read and update profile (name and optional logo upload).

FR-3 Brand context onboarding:
- Persist brand profile with category and competitors.
- Retrieve latest brand profile for current session user.

FR-4 Synchronous analysis:
- Analyze a keyword + URL and return full result payload in one request.

FR-5 Asynchronous analysis:
- Queue analysis job, expose progress stages, and provide final result via polling.

FR-6 Dashboard data APIs:
- Scan history, scan details, aggregate stats, insights, pillar averages, trends, citations.

FR-7 Report export:
- Generate downloadable PDF report for a completed scan.

FR-8 Frontend experience:
- Public landing and auth routes.
- Protected dashboard routes for analysis and historical insights.
- Knowledge pages for score interpretation and improvement guidance.

## 4.2 Non-Functional Requirements (Current + Practical Expectations)

NFR-1 Reliability:
- API returns structured error envelopes.
- Analysis pipeline includes fallback paths when external dependencies fail.

NFR-2 Security baseline:
- Session signer enabled.
- Secret key sourced from environment (`FLASK_SECRET_KEY`), with warning on insecure dev fallback.
- Secrets excluded from git (`.env`, runtime artifacts, db/session files).

NFR-3 Observability:
- Request IDs propagated through `X-Request-Id`.
- Job lifecycle tracked in `analysis_jobs` and `scan_run_events`.

NFR-4 Maintainability:
- Backend separated into route and module layers.
- Frontend uses typed contracts and central API client error normalization.

NFR-5 Performance posture:
- Async analysis for longer-running work.
- Polling interval for analysis status is fixed and terminal-state aware.

NFR-6 Reproducibility:
- `SERPAPI_MOCK=1` mode for deterministic local behavior when needed.

---

## 5. In Scope vs Out of Scope

## 5.1 In Scope

- GEO visibility analysis workflow from user login to report export.
- Persistent historical metrics for longitudinal review.
- Full-stack local run and CI validation.

## 5.2 Out of Scope (Current)

- Multi-tenant org/role system beyond single-session user model.
- Enterprise-grade secret vaulting and key rotation automation.
- Horizontal scaling architecture (this implementation is single-node oriented).
- Production-grade distributed queueing for async jobs (currently thread-based worker).
- Full e2e suite in repository scope (e2e folder currently excluded from tracked project artifacts).

---

## 6. Technology Stack

## 6.1 Backend (Python)

- Flask 2.3.3
- Flask-Session 0.5.0
- Werkzeug 2.3.7
- requests 2.31.0
- python-dotenv 1.0.0
- playwright 1.40.0
- google-genai 0.7.0
- beautifulsoup4 4.12.3
- trafilatura 1.12.0
- readability-lxml 0.8.1
- reportlab 4.2.5
- SQLite (built-in `sqlite3`)

## 6.2 Frontend (TypeScript/React)

- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- React Query 5
- Recharts 3.7.0
- Framer Motion 12.34.0
- Sonner 2.0.7
- Vitest 4

## 6.3 CI

- GitHub Actions:
  - Backend compile check.
  - Frontend lint, typecheck, unit tests, build.

---

## 7. Repository Scaffold

```text
.
|-- app.py
|-- requirements.txt
|-- start-app.bat
|-- backend/
|   |-- routes/
|   |-- modules/
|   `-- README.md
|-- frontend/
|   |-- src/
|   |-- package.json
|   `-- README.md
|-- docs/
|   |-- SETUP.md
|   |-- ARCHITECTURE.md
|   |-- API_REFERENCE.md
|   |-- TROUBLESHOOTING.md
|   `-- PROJECT_CONTEXT_DOSSIER.md
|-- .github/workflows/ci.yml
|-- .env.example
|-- .gitignore
|-- LICENSE
`-- README.md
```

Excluded from version control by design:

- `.env`, secrets.
- `backend/database.db`, `backend/flask_session/`.
- `backend/static/profile/`, `backend/static/screenshots/`.
- `frontend/node_modules/`, `frontend/.next/`.
- `frontend/e2e/`, `frontend/artifacts/`.
- `extra/`.

---

## 8. System Architecture Overview

## 8.1 Runtime Topology

- Frontend runs on port `3001` (launcher default).
- Backend runs on port `5000`.
- Frontend rewrites:
  - `/api/*` -> backend `/api/*`
  - `/static/*` -> backend `/static/*`
- Auth is cookie/session based, so frontend requests use `credentials: include`.

## 8.2 High-Level Flow

1. User logs in/registers.
2. User creates brand profile.
3. User starts analysis (sync or async).
4. Backend fetches search context + scrapes target URL.
5. AI engine normalizes structured output.
6. LAS / trust (citation authority proxy) computed.
7. Artifacts persisted into SQLite tables.
8. Frontend renders dashboard and report views from API data.

---

## 9. Backend Deep Dive

## 9.1 Application Bootstrap (`app.py`)

Responsibilities:

- Create Flask app with static serving from `backend/static`.
- Configure logging.
- Configure server-side session storage using filesystem backend.
- Register route blueprints (`auth`, `brand`, `analysis`, `dashboard`).
- Attach request-id middleware and response header propagation.
- Provide consistent JSON error handlers for HTTP 400/401/403/404/500.

Security-relevant behavior:

- `FLASK_SECRET_KEY` expected from environment.
- If not provided, dev fallback key is used and warning is logged.

## 9.2 Route Blueprints

### Auth routes (`backend/routes/auth_routes.py`)

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/profile`
- `POST /api/profile`

Notes:

- Profile upload supports logo file and validates allowed extensions.
- Session user ID is required for protected auth/profile operations.

### Brand routes (`backend/routes/brand_routes.py`)

- `POST /api/brand`
- `GET /api/brand/<user_id>`

Notes:

- Brand category enum: `generic | ecommerce | saas | local`.
- Competitors are parsed and normalized.
- Access to `GET /api/brand/<user_id>` is session-bound and ownership-checked.

### Analysis routes (`backend/routes/analysis_routes.py`)

- `POST /api/run-analysis`
- `POST /api/run-analysis-async`
- `GET /api/analysis-status/<job_id>`

Notes:

- Validates input (`keyword`, `url`) and brand profile precondition.
- Async path writes lifecycle state transitions and progress.
- On completion, persists scan results and derivative artifacts.

### Dashboard routes (`backend/routes/dashboard_routes.py`)

- `GET /api/dashboard/scan-history/<user_id>`
- `GET /api/dashboard/scan-result/<scan_id>`
- `GET /api/dashboard/stats/<user_id>`
- `GET /api/dashboard/insights/<user_id>`
- `GET /api/dashboard/trends/<user_id>`
- `GET /api/dashboard/pillar-averages/<user_id>`
- `GET /api/dashboard/citations/<user_id>`
- `GET /api/report/<scan_id>/pdf`

Notes:

- User ownership checks are applied on protected resource retrieval.
- Report PDF generation depends on `reportlab`.

## 9.3 Analysis Pipeline Module (`backend/modules/analysis.py`)

Pipeline stages:

1. Determine brand category and context.
2. Fetch AI/search context:
   - SerpApi if available.
   - Mock/fallback text if configured or unavailable.
3. Scrape target page HTML with Playwright.
4. Submit search + page evidence to AI engine.
5. Normalize output and compute LAS + trust score.
6. Persist:
   - scan result row,
   - metrics,
   - citations,
   - observations,
   - async events/job status.

AI overview source strategy (priority):

1. Embedded AI overview text.
2. Follow-up via page token / serpapi link.
3. Answer box.
4. Knowledge graph.
5. Top organic snippet.
6. Fallback context text.

## 9.4 AI Engine (`backend/modules/ai_engine.py`)

Responsibilities:

- Build prompt with brand/search/page context.
- Call Gemini model via `google-genai`.
- Parse and normalize model output to stable schema.
- Enforce output cleanliness and anti-noise constraints.
- Fallback to deterministic safe payload on failure.

Extraction strategy for page text:

1. `trafilatura`
2. `readability-lxml`
3. BeautifulSoup fallback

Normalization strategy:

- Clamp scores and sentiment ranges.
- Normalize market intel, gap analysis, technical audit, action plan, diagnostics, summary.
- Build chart data for frontend.
- Provide backward-compatible legacy keys where needed.

---

## 10. Data Model and Persistence

Database: SQLite at `backend/database.db` (excluded from git).

## 10.1 Core Tables

`users`:
- identity + credentials + optional profile metadata.

`brand_profiles`:
- user-owned brand context, category, competitors.

`scan_results`:
- primary scan record including scores, raw/breakdown JSON, metadata.

`analysis_jobs`:
- async job status, progress, stage labels, result payload.

`scan_run_events`:
- per-stage event timeline for each async job.

`scan_metrics`:
- normalized metric time-series for trends and averages.

`scan_citations`:
- citation domain/url/position evidence entries.

`prompt_observations`:
- prompt-level tracking fields including mention/sentiment posture.

## 10.2 Schema Evolution Support

`database.py` includes backward-compatibility column checks and additive migrations via:

- `PRAGMA table_info`
- conditional `ALTER TABLE ADD COLUMN`

## 10.3 Indexing

Indexes optimize:

- metrics by brand/keyword/time,
- citations by brand/time,
- events by job/time,
- observations by brand/time.

---

## 11. Frontend Deep Dive

## 11.1 App Router Structure

Public/auth routes:

- `/`
- `/login`
- `/register`
- `/forbidden`
- `/knowledge`
- `/knowledge/las`
- `/knowledge/sentiment`
- `/knowledge/improvement`

Protected routes:

- `/onboarding/brand`
- `/dashboard`
- `/dashboard/analysis/new`
- `/dashboard/analysis/live/[jobId]`
- `/dashboard/results/[scanId]`
- `/dashboard/history`
- `/dashboard/stats`
- `/dashboard/trends`
- `/dashboard/profile`

## 11.2 Data Access Layer

Core components:

- `src/lib/api/client.ts`: centralized request wrapper with:
  - `credentials: include`
  - error envelope normalization
  - support for JSON/blob/text responses

- `src/lib/types/contracts.ts`: canonical API type contracts.

- React Query hooks under `src/hooks/api/`:
  - auth, brand, analysis, dashboard, profile, PDF download.

Async analysis polling behavior:

- fixed interval (`ANALYSIS_POLL_INTERVAL_MS`).
- polling stops on `completed` or `failed`.

## 11.3 UI Composition

Primary UI modules:

- Auth gate and brand-profile gate wrappers.
- Dashboard shell (navigation, logout, profile completion prompt).
- Metric and chart components.
- Reusable UI primitives (button/input/glass-card/toaster/state).

## 11.4 Build and Test

Commands:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Unit tests currently target:

- API error normalization.
- analysis normalizers.
- auth/analysis hooks.
- core button UI behavior.

---

## 12. API Contract Summary

### Auth contract highlights

- Success envelope generally includes `success: true`.
- Error envelope uses:
  - `success: false`
  - `error.code`
  - `error.message`
  - optional `error.request_id`.

### Analysis contract highlights

Async create:

```json
{
  "success": true,
  "job_id": "string",
  "scan_context_id": "string",
  "est_duration_sec": 45,
  "status": "queued"
}
```

Async status:

- returns progress + stage + metadata.
- includes `result` object when job is completed.

Dashboard scan result:

- includes LAS, trust/citation authority, breakdown and full report artifacts.

---

## 13. Security and Privacy Considerations

Current safeguards:

- Session-based access control on protected endpoints.
- Ownership checks for user-bound resources.
- Secret-key environment variable support.
- Git excludes runtime data and secrets by default.

Current risks/limitations:

- Local filesystem session store not ideal for distributed production.
- SQLite file DB suitable for single-node or small-scale usage.
- External dependency failure risk (SerpApi, Gemini).

Recommended hardening roadmap:

1. Replace filesystem session storage with production session backend.
2. Add rate limiting and stricter upload/content validation.
3. Add structured audit logging and central log sinks.
4. Introduce token/key rotation policy and secrets manager integration.

---

## 14. DevOps and Operational Model

## 14.1 Local launcher

`start-app.bat`:

- Starts backend in one terminal.
- Starts frontend in another terminal on port 3001.
- Handles Python executable fallback (`.venv`, `python`, or `py -3`).

## 14.2 CI workflow

`/.github/workflows/ci.yml`:

- On push/PR to `main`.
- Backend job:
  - Python 3.11.
  - install requirements.
  - compileall check.
- Frontend job:
  - Node 20.
  - npm ci.
  - lint + typecheck + test + build.

---

## 15. Known Limitations and Tradeoffs

1. Async processing uses in-process threads.
2. Production scale concerns with filesystem sessions + SQLite.
3. LLM output quality still depends on upstream data completeness and API reliability.
4. Some frontend artifacts and e2e demos are intentionally excluded from repository scope.
5. CI does not currently run full integration/e2e workflows.

---

## 16. Suggested Future Improvements

Short term:

1. Add integration test harness for backend endpoints.
2. Add migrations framework instead of ad-hoc additive schema checks.
3. Add stronger input sanitization and file upload constraints.
4. Add richer dashboard filters and time window presets.

Medium term:

1. Move async jobs to a queue/worker model.
2. Move SQLite to managed relational DB.
3. Add role-based access and organization model.
4. Add observability stack (metrics, traces, alerts).

---

## 17. Quickstart Commands (Reference)

Backend setup:

```bash
python -m pip install -r requirements.txt
python -m playwright install chromium
python app.py
```

Frontend setup:

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Validation:

```bash
python -m compileall -q app.py backend
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 18. AI-Ingestion Ready Context Block

Use this section when pasting into AI tools:

Project name: AnswerScope AI  
Architecture: Next.js frontend + Flask backend + SQLite persistence.  
Primary function: AI visibility analysis for brand keyword/url contexts with async job tracking and dashboard analytics.  
Core flows: auth -> brand onboarding -> run analysis -> monitor async status -> view dashboard stats/history/trends -> export PDF report.  
Backend modules: `analysis.py` orchestrates pipeline; `ai_engine.py` normalizes LLM output; `database.py` manages schema and indexes.  
Frontend model: typed contracts + React Query hooks + protected dashboard route groups.  
Auth model: session-cookie based (`credentials: include`).  
Runtime defaults: backend on 5000, frontend on 3001, Next rewrites `/api` and `/static` to backend.  
Critical env vars: `FLASK_SECRET_KEY`, `GOOGLE_API_KEY` or `GEMINI_API_KEY`, optional `SERPAPI_KEY`, optional `SERPAPI_MOCK`.  
Persistence tables: users, brand_profiles, scan_results, analysis_jobs, scan_run_events, scan_metrics, scan_citations, prompt_observations.  
Error contract: `success=false` with structured `error.code/message/request_id`.  
Repository policy: exclude secrets/runtime/generated files from git; e2e artifacts excluded from tracked scope.

---

## 19. Glossary

LAS:
- A composite visibility score used by the platform.

Citation Authority:
- Trust-oriented metric derived from trust scoring and citation signals.

Scan:
- One analysis execution for a specific keyword + target URL under a brand context.

Brand Context:
- Brand name, category, and competitor set used to frame analysis.

Async Job:
- Background execution unit for analysis with stage/progress tracking.

Breakdown JSON:
- Structured normalized analysis used by dashboard rendering.

Raw Report JSON:
- Full persisted payload combining analysis details and metadata.
