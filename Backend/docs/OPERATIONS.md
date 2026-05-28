# AELO backend operations

## Local deploy

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Run `docker compose exec api python manage.py makemigrations`.
4. Run `docker compose exec api python manage.py migrate`.
5. Run `docker compose exec api python manage.py seed_initial_data`.

The Django API runs on `http://localhost:8000`.
The AI service runs on `http://localhost:8001`.

## Migration strategy

Create migrations per app with small, reviewable schema changes. Avoid mixing data migrations with broad model rewrites. For production, commit generated migrations and run them in a deployment step before shifting traffic to new containers. The compose command uses `--run-syncdb` only to make the first local MVP boot forgiving before migrations are generated.

## Versioning strategy

Use semantic versioning for backend releases. Keep breaking API changes behind `/api/v2/` or feature flags. Commit migrations with the model change that created them.

## LGPD strategy

Collect the minimum necessary clinical data, enforce role and ownership checks, audit sensitive actions, anonymize text before AI processing when possible, and keep AI analysis as assistive content pending human review. Support soft delete for operational recovery and define a retention/anonymization policy for production.
