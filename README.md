# Budget Forecast

A full-stack personal finance tracking and forecasting app with JWT authentication, transaction management, KPI targets, and spending analytics.

**Live app:** https://budget-risk-monitor.vercel.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router, Recharts, Axios |
| Backend | Django 5.2, Django REST Framework, SimpleJWT |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Forecasting | NumPy, Statsmodels |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Containerisation | Docker, Docker Compose |
| CI/CD | GitHub Actions |

---

## Features

- **Authentication** — Register, login, and logout with JWT access/refresh tokens
- **Transactions** — Add, view, and categorise income and expense transactions
- **Categories** — Create custom income/expense categories per user
- **KPI Targets** — Set personal targets: expense limit, minimum savings, savings rate
- **Analytics** — Visual spending breakdown and financial forecasting

---

## Project Structure

```
budget_forecast_app/
├── accounts/          # User registration and auth
├── transactions/      # Transaction and category models/API
├── analytics/         # Forecasting and analytics API
├── kpi/               # KPI target model/API
├── backend/           # Django settings, URLs, WSGI
├── frontend/          # React app
│   ├── src/
│   ├── Dockerfile     # Multi-stage build (Node → nginx)
│   └── .env.production
├── Dockerfile         # Backend container
├── docker-compose.yml # Local full-stack dev environment
├── requirements.txt
└── .github/
    └── workflows/
        └── ci.yml     # GitHub Actions CI/CD pipeline
```

---

## Running Locally with Docker

The easiest way to run the full stack locally.

**Prerequisite:** [Docker Desktop](https://www.docker.com/products/docker-desktop) must be running.

```bash
# Start all 3 services (PostgreSQL, Django backend, React frontend)
docker-compose up --build

# Stop all services
docker-compose down

# Stop and remove the database volume
docker-compose down -v
```

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

---

## Running Locally without Docker

**Backend**

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SECRET_KEY=your-secret-key
export DB_NAME=finance_db
export DB_USER=finance_user
export DB_PASSWORD=finance_password
export DB_HOST=localhost

# Run migrations and start server
python manage.py migrate
python manage.py runserver
```

**Frontend**

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`, backend at `http://localhost:8000`.

---

## Environment Variables

**Backend**

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key | `dev-secret-key` |
| `DEBUG` | Debug mode | `False` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `127.0.0.1,localhost` |
| `DB_NAME` | PostgreSQL database name | `finance_db` |
| `DB_USER` | PostgreSQL user | `finance_user` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:3000` |

**Frontend**

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL |

---

## CI/CD Pipeline

Every push to `main` triggers a 4-job GitHub Actions pipeline:

```
test-backend ──┐
               ├──► push-to-dockerhub  (main branch only)
build-backend ─┤
               │
build-frontend ┘
```

| Job | What it does |
|---|---|
| `test-backend` | Runs Django tests against a real PostgreSQL service container |
| `build-backend-image` | Builds the backend Docker image |
| `build-frontend-image` | Builds the frontend Docker image |
| `push-to-dockerhub` | Pushes both images to Docker Hub (only on push to `main`) |

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

---

## Docker Images

Published to Docker Hub on every merge to `main`:

- `sruthikannan05/budget-backend:latest`
- `sruthikannan05/budget-frontend:latest`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/accounts/register/` | Register a new user |
| POST | `/api/accounts/login/` | Login and receive JWT tokens |
| POST | `/api/accounts/token/refresh/` | Refresh access token |
| GET/POST | `/api/transactions/` | List or create transactions |
| GET/POST | `/api/transactions/categories/` | List or create categories |
| GET/PUT | `/api/kpi/targets/` | Get or update KPI targets |
| GET | `/api/analytics/summary/` | Spending summary and forecast |

---

## Deployment

**Frontend — Vercel**

The `frontend/` directory is deployed to Vercel. Set `REACT_APP_API_URL` to your backend URL in Vercel's environment variable settings.

**Backend — Render**

Deployed via `Procfile`:
```
web: python manage.py migrate && gunicorn backend.wsgi --bind 0.0.0.0:$PORT
```

Set all backend environment variables in Render's dashboard under Environment.

> Note: Render's free tier spins down after 15 minutes of inactivity. The first request after idle takes 30–60 seconds to respond.
