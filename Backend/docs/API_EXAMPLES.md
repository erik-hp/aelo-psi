# AELO API examples

## Login

POST `/api/auth/login/`

```json
{
  "username": "admin",
  "password": "admin12345"
}
```

## Create patient

POST `/api/patients/`

```json
{
  "internal_code": "P-0001",
  "display_name": "Patient A",
  "status": "ACTIVE"
}
```

## Create session

POST `/api/sessions/`

```json
{
  "patient": "patient-uuid",
  "scheduled_at": "2026-06-01T14:00:00-03:00",
  "status": "SCHEDULED",
  "summary": ""
}
```

## Create clinical note

POST `/api/clinical-notes/`

```json
{
  "patient": "patient-uuid",
  "session": "session-uuid",
  "raw_text": "Narrative clinical note. Identifying data is anonymized before AI processing."
}
```

## Request AI analysis

POST `/api/analysis/request/`

```json
{
  "patient": "patient-uuid",
  "note": "note-uuid",
  "context_limit": 10
}
```

## Validate or reject AI analysis

POST `/api/analysis/{id}/validate/`

```json
{
  "comment": "Reviewed by responsible psychologist."
}
```

POST `/api/analysis/{id}/reject/`

```json
{
  "comment": "Rejected because context was insufficient."
}
```
