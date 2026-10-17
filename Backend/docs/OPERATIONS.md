# AELO backend operations

## Local deploy

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Run `docker compose exec api python manage.py makemigrations`.
4. Run `docker compose exec api python manage.py migrate` (also executed on container startup).
5. Create a development superuser explicitly using `docker compose exec api python manage.py createsuperuser`.
6. Associate a clinic with this user before creating patients. Example for a **synthetic local-only** environment:

```bash
docker compose exec api python manage.py shell -c "from apps.clinics.models import Clinic; from django.contrib.auth import get_user_model; c,_=Clinic.objects.get_or_create(name='Clinica Sintetica'); u=get_user_model().objects.get(username='YOUR_SUPERUSER'); u.clinic=c; u.save(update_fields=['clinic'])"
```

Replace `YOUR_SUPERUSER` with the username you created. The username is not a password; do not paste secrets into the shell. The synthetic seeding command is optional and should not run automatically.

**Security:** the former automatic `seed_initial_data` command has been removed from Compose. The synthetic seed command has been hardened: it creates no users or passwords and requires the explicit environment variable `AELO_ALLOW_SYNTHETIC_SEED=1` plus an existing `--admin-username` with a clinic. The command is not for shared or production environments. PostgreSQL and API are bound to loopback; Ollama/FastAPI have no published host ports. Configure strong secrets in `.env` and do not use real clinical records in this environment.

The Django API runs on `http://localhost:8000`.
The AI service runs on `http://localhost:8001`.

## Internal AI service authentication

Configure `AI_SERVICE_TOKEN` as a separate high-entropy secret in `Backend/.env` shared only by the Django API and FastAPI service. The FastAPI `/analysis` endpoint rejects missing/invalid tokens; `/health` only signals process availability. Do not expose FastAPI/Ollama outside the isolated network. The Django `/admin/` route is disabled by default and only enabled locally when `DJANGO_DEBUG=True` and `AELO_ENABLE_DJANGO_ADMIN=True`; do not enable it with real patient information because its model administration does not enforce per-patient DRF permissions.

## Migration strategy

Create migrations per app with small, reviewable schema changes. Avoid mixing data migrations with broad model rewrites. For production, commit generated migrations and run them in a deployment step before shifting traffic to new containers. The compose command uses `--run-syncdb` only to make the first local MVP boot forgiving before migrations are generated.

## Versioning strategy

Use semantic versioning for backend releases. Keep breaking API changes behind `/api/v2/` or feature flags. Commit migrations with the model change that created them.

## LGPD strategy

Collect the minimum necessary clinical data, enforce role and ownership checks, audit sensitive actions, anonymize text before AI processing when possible, and keep AI analysis as assistive content pending human review. Support soft delete for operational recovery and define a retention/anonymization policy for production.
