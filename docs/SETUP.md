# Setup Guide

## 1. Clone And Enter Project

```bash
git clone <repo-url>
cd "AnswerScope AI - V3 Ongoing"
```

## 2. Configure Environment

```bash
cp .env.example .env
```

Set at minimum:
- `FLASK_SECRET_KEY`
- `GOOGLE_API_KEY` (or `GEMINI_API_KEY`)

Optional local/dev:
- `SERPAPI_MOCK=1`
- `SERPAPI_KEY` for live search context

## 3. Backend Setup

```bash
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
.venv\Scripts\python.exe -m pip install --prefer-binary -r requirements.txt
.venv\Scripts\python.exe -m playwright install chromium
.venv\Scripts\python.exe app.py
```

Backend runs on `http://127.0.0.1:5000`.

Windows one-step helper:

```bat
setup-backend.bat
```

## 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Frontend runs on `http://127.0.0.1:3001`.

## 5. Run Quality Checks

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
