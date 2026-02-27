# Backend

Flask API for authentication, brand onboarding, analysis, dashboard metrics, and PDF export.

## Entrypoint

- Run from project root:
  - `python app.py`

## Structure

- `backend/routes/`: HTTP blueprints (`auth`, `brand`, `analysis`, `dashboard`)
- `backend/modules/`: service/data modules (`analysis`, `ai_engine`, `database`, etc.)
- `backend/static/`: runtime-generated assets (excluded from git)

## Notes

- Database file: `backend/database.db` (excluded from git)
- Session store: `backend/flask_session/` (excluded from git)
- Environment setup and API details:
  - see root [README](../README.md)
  - see [docs/SETUP.md](../docs/SETUP.md)
  - see [docs/API_REFERENCE.md](../docs/API_REFERENCE.md)
