# Troubleshooting

## Backend Fails To Start

- Confirm Python version is 3.11.x.
- Install dependencies:
  - `py -3.11 -m venv .venv`
  - `.venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel`
  - `.venv\Scripts\python.exe -m pip install --prefer-binary -r requirements.txt`
- If Playwright errors appear:
  - `.venv\Scripts\python.exe -m playwright install chromium`

## `flask_session` Module Not Found

This means backend dependencies were installed in a different Python than the one used to run `app.py`.

Use the same interpreter for install and run:

- `.venv\Scripts\python.exe -m pip install --prefer-binary -r requirements.txt`
- `.venv\Scripts\python.exe app.py`

## `Failed building wheel for greenlet`

This is usually caused by unsupported Python version (commonly 3.13 on Windows for pinned dependency trees).

Fix:

1. Install Python 3.11.
2. Recreate virtual environment with 3.11.
3. Reinstall using `--prefer-binary`.

Shortcut:

- Run `setup-backend.bat` from project root.

## Frontend Cannot Reach API

- Ensure backend is running on `127.0.0.1:5000`.
- Check `frontend/next.config.ts` rewrite rules.
- Confirm browser has session cookies for backend-authenticated routes.

## `unauthorized` Errors On Protected Routes

- Login first (`/login`) and keep same browser session.
- Ensure frontend requests include credentials (already enforced in `apiRequest`).

## Analysis Runs But Has Weak Context

- If `SERPAPI_KEY` is missing, backend falls back to website-only context.
- Use:
  - `SERPAPI_KEY=<your-key>`
  - or `SERPAPI_MOCK=1` for deterministic local testing.

## `internal_error` During Model Analysis

- Set one AI key:
  - `GOOGLE_API_KEY`, or
  - `GEMINI_API_KEY`
- Optional model override:
  - `AI_MODEL=gemini-2.5-pro`

## PDF Export Fails

- Ensure `reportlab` is installed from `requirements.txt`.
- Confirm scan exists and belongs to the current authenticated user.

## CI Fails On Frontend

- Re-run locally:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`

## Session Warnings In Production

- Set `FLASK_SECRET_KEY` to a long random value.
- Do not use default fallback secret outside local development.
