"""F0-02: clinical reads must keep their scope across every derived endpoint.

Uses synthetic persisted records and real DRF views/serializers. Authentication
is forced to isolate object authorization; JWT lifecycle has a separate suite.
"""

import pytest
from rest_framework.test import APIClient

from apps.ai_analysis.models import AnalysisJob


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["note", "session", "analysis", "analysis-job", "vault", "vault-job", "checkpoint", "fhir"])
@pytest.mark.parametrize("actor", ["owner", "reader", "editor", "intern", "admin", "ungranted", "revoked", "outsider", "anonymous"])
def test_clinical_read_authorization_matrix(clinical_scope, actor, endpoint):
    actors, paths = clinical_scope
    client = APIClient()
    if actors[actor] is not None:
        client.force_authenticate(user=actors[actor])
    response = client.get(paths[endpoint])
    if actor in {"owner", "reader", "editor", "intern"}:
        assert response.status_code == 200
    else:
        # An admin sees the registration directory, but export still requires
        # clinical access. Other callers cannot even resolve the patient.
        expected = 401 if actor == "anonymous" else 403 if actor == "admin" and endpoint == "fhir" else 404
        assert response.status_code == expected
        assert b"Original text" not in response.content
        assert b"Synthetic checkpoint evidence" not in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("actor", ["reader", "intern", "admin", "ungranted", "revoked", "outsider", "anonymous"])
def test_read_access_never_authorizes_ai_processing(clinical_scope, records, actor):
    actors, _ = clinical_scope
    client = APIClient()
    if actors[actor] is not None:
        client.force_authenticate(user=actors[actor])
    before = AnalysisJob.objects.count()
    response = client.post("/api/analysis/request/", {"patient": str(records["patient"].pk)}, format="json")
    expected = 401 if actor == "anonymous" else 403 if actor in {"reader", "intern"} else 404
    assert response.status_code == expected
    assert AnalysisJob.objects.count() == before
