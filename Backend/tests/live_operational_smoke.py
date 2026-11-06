"""HTTP verification with explicitly synthetic local accounts; never logs tokens or note text.

Requires DEBUG and AELO_SMOKE_EMAIL pointing to a local `acesso_local_*` psychologist.
Creates identifiable synthetic records and preserves them for inspection (no clinical deletion).
"""
import json
import os
import secrets
import urllib.error
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken


def main():
    assert settings.DEBUG, "Local development only."
    user = get_user_model().objects.get(email=os.environ["AELO_SMOKE_EMAIL"], is_active=True)
    assert user.username.startswith("acesso_local_") and user.role == "PSYCHOLOGIST"
    assert not user.is_staff and not user.is_superuser
    token = str(RefreshToken.for_user(user).access_token)

    def call(path, method="GET", payload=None, expected=200, access=token):
        headers = {"Content-Type": "application/json", "Origin": "http://localhost:5173"}
        if access:
            headers["Authorization"] = "Bearer " + access
        request = urllib.request.Request(
            "http://127.0.0.1:8000/api/" + path, method=method,
            data=json.dumps(payload).encode() if payload is not None else None, headers=headers,
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                code, body = response.status, json.load(response)
        except urllib.error.HTTPError as error:
            code, body = error.code, {}
        assert code == expected, f"{method} {path}: HTTP {code}, expected {expected}"
        return body

    patient_input = {"display_name": "Paciente sintetico de auditoria", "internal_code": "AUDIT-" + secrets.token_hex(6)}
    patient = call("patients/", "POST", patient_input, 201)
    call("patients/", "POST", patient_input, 400)
    session_input = {"patient": patient["id"], "scheduled_at": (timezone.now() + timedelta(minutes=15, seconds=secrets.randbelow(600))).replace(microsecond=0).isoformat(), "summary": "Agendamento sintetico para teste tecnico."}
    session = call("sessions/", "POST", session_input, 201)
    call("sessions/", "POST", session_input, 400)
    text = "Registro sintetico de auditoria tecnica. Nenhuma informacao de paciente real."
    note = call("clinical-notes/", "POST", {"patient": patient["id"], "session": session["id"], "raw_text": text}, 201)
    assert call(f"clinical-notes/{note['id']}/")["raw_text"] == text
    revised = call(f"clinical-notes/{note['id']}/", "PATCH", {"raw_text": text + " Revisao sintetica.", "expected_version": 1})
    assert revised["version"] == 2
    call(f"clinical-notes/{note['id']}/", "PATCH", {"raw_text": "Copia antiga sintetica.", "expected_version": 1}, 409)
    call(f"sessions/{session['id']}/", "PATCH", {"status": "COMPLETED"})
    assert call(f"clinical-notes/{note['id']}/")["locked_at"] is None
    own_sessions = call(f"sessions/?patient={patient['id']}")
    assert any(item["id"] == session["id"] for item in own_sessions["results"])
    other = get_user_model().objects.get(email="psi@aelo.com")
    assert other.pk != user.pk
    other_token = str(RefreshToken.for_user(other).access_token)
    call(f"patients/{patient['id']}/", expected=404, access=other_token)
    call(f"clinical-notes/{note['id']}/", expected=404, access=other_token)
    call("patients/", expected=401, access="")
    print("LIVE_OPERATIONAL_SMOKE_OK: patient/session/note persisted; duplicate code/time=400; stale version=409; unauthorized=401/404; session completion did not sign note.")
