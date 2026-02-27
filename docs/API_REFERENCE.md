# API Reference

Base backend URL: `http://127.0.0.1:5000`  
Frontend uses Next rewrite so app calls `/api/*`.

## Auth

- `POST /api/register`
  - body: `{ "email": string, "password": string }`
- `POST /api/login`
  - body: `{ "email": string, "password": string }`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/profile`
- `POST /api/profile`
  - accepts JSON or form-data (`name`, optional `logo`)

## Brand Profile

- `POST /api/brand`
  - body: `{ "brand_name", "website_url", "competitors", "brand_category" }`
- `GET /api/brand/<user_id>`

## Analysis

- `POST /api/run-analysis`
  - body: `{ "keyword": string, "url": string }`
  - returns sync analysis result + persisted `scan_id`
- `POST /api/run-analysis-async`
  - body: `{ "keyword": string, "url": string }`
  - returns `job_id`
- `GET /api/analysis-status/<job_id>`
  - returns current stage/progress and final result on completion

## Dashboard

- `GET /api/dashboard/scan-history/<user_id>`
- `GET /api/dashboard/scan-result/<scan_id>`
- `GET /api/dashboard/stats/<user_id>`
- `GET /api/dashboard/insights/<user_id>`
- `GET /api/dashboard/pillar-averages/<user_id>`
- `GET /api/dashboard/trends/<user_id>?metric=<metric>&window=<7d|14d|30d|60d|90d>`
- `GET /api/dashboard/citations/<user_id>?window=<7d|14d|30d|60d|90d>`

## Reports

- `GET /api/report/<scan_id>/pdf`

## Error Envelope

All error responses follow:

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "request_id": "uuid-or-null"
  }
}
```

## Auth Model

- Session cookie auth (`credentials: include`) is required.
- Most user-specific routes enforce `session.user_id`.
