import base64

import pytest
from rest_framework.test import APIClient

from apps.audit_logs.models import AuditLog


@pytest.mark.django_db
def test_fhir_export_is_scoped_audited_and_contains_current_note(records):
    patient = records["patient"]
    client = APIClient()
    client.force_authenticate(user=records["reader"])
    response = client.get(f"/api/patients/{patient.id}/fhir/")
    assert response.status_code == 200
    assert response["Content-Type"] == "application/fhir+json"
    assert response["Cache-Control"] == "no-store"
    bundle = response.json()
    assert bundle["resourceType"] == "Bundle"
    resources = [entry["resource"] for entry in bundle["entry"]]
    assert {resource["resourceType"] for resource in resources} == {"Patient", "Encounter", "DocumentReference"}
    note = next(resource for resource in resources if resource["resourceType"] == "DocumentReference")
    assert base64.b64decode(note["content"][0]["attachment"]["data"]).decode() == "Original text"
    assert AuditLog.objects.filter(action="FHIR_EXPORT", entity_id=str(patient.id)).exists()

    client.force_authenticate(user=records["outsider"])
    assert client.get(f"/api/patients/{patient.id}/fhir/").status_code == 404
