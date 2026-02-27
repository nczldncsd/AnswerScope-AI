# Frontend

Next.js App Router client for AnswerScope AI.

## Stack

- Next.js + TypeScript (strict)
- Tailwind CSS
- React Query
- Framer Motion
- Recharts
- Sonner

## Backend Contract

- Backend expected at `http://127.0.0.1:5000`
- Rewrites in `next.config.ts`:
  - `/api/*` -> backend `/api/*`
  - `/static/*` -> backend `/static/*`
- Session-cookie auth required (`credentials: include`)

## Run

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

## Validate

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For full setup and architecture, see:
- [root README](../README.md)
- [docs/SETUP.md](../docs/SETUP.md)
