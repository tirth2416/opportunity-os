# OpportunityOS

OpportunityOS is a Next.js dashboard backed by a FastAPI service. The existing
JSearch integration remains the source of live listings; resume analysis is
keyword-based and does not use an LLM. A shared development profile ID
(`student001`) is used until authentication is added.

## Local setup
    
### Backend

```bash
conda activate /path/to/opportunity-os/.conda
cd /path/to/opportunity-os/backend
python -m pip install -r requirements.txt
cp .env.example .env
```

Set `RAPIDAPI_KEY` in `backend/.env` to a valid RapidAPI key for JSearch. Start
the API from the `backend` directory:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

`DATABASE_PATH` defaults to `backend/profiles.db`. Existing profile records are
kept in place; the API adds application, deadline, and roadmap tables using
non-destructive `CREATE TABLE IF NOT EXISTS` statements and additive column
migrations.

### Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open <http://localhost:3000>. `NEXT_PUBLIC_API_URL` should point to the FastAPI
service, normally `http://127.0.0.1:8000`.

## Tests and checks

Run the frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

Run backend API and persistence tests:

```bash
cd backend
python -m pip install -r requirements-test.txt
python -m unittest -v test_main
```

The backend tests use an isolated temporary SQLite database and stub the
JSearch HTTP response; they do not alter the existing profile database or
require a RapidAPI key. Run both commands with the same activated Conda
environment used by the backend.

VS Code uses `.conda/bin/python` as the workspace interpreter so Pylance sees
the backend dependencies installed in that environment.

## API additions

- `GET /health`
- `POST /matching/score` and `POST /matching/scores`
- `GET /applications/{user_id}` and `POST /applications`
- `PUT|DELETE /applications/{application_id}`
- `GET /deadlines/{user_id}` and `POST /deadlines`
- `PATCH|DELETE /deadlines/{deadline_id}`
- `GET /roadmap/{user_id}` and `POST /roadmap`
- `PATCH|DELETE /roadmap/{task_id}`

Application and deadline writes are scoped by the supplied `user_id`; this is
not authentication or multi-user isolation. Do not expose the shared
development API to untrusted users.

## Render preparation

`render.yaml` defines separate frontend and backend web services. The backend
stores SQLite data on a persistent disk mounted at `/var/data`, exposes
`/health` for checks, and reads the JSearch key from Render's secret prompt.
The persistent-disk blueprint requires a Render plan that supports disks.
After creating the services, verify that the frontend URL in `CORS_ORIGINS`
matches the deployed frontend URL.

The current backend uses SQLite only. PostgreSQL is not configured; migrate the
database adapter and data deliberately before switching to a PostgreSQL
production service. No deployment is performed by these instructions.
