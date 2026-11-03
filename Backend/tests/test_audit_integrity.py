import pytest
from django.db import DatabaseError, connection, transaction
from rest_framework.test import APIClient

from apps.audit_logs.integrity import verify_audit_chain
from apps.audit_logs.models import AuditLog


@pytest.mark.django_db
def test_audit_chain_detects_changed_and_missing_events(records):
    client = APIClient()
    client.force_authenticate(user=records["reader"])
    assert client.get(f"/api/clinical-notes/{records['note'].id}/").status_code == 200
    assert client.get("/api/clinical-notes/").status_code == 200
    assert verify_audit_chain()[0]

    first = AuditLog.objects.get(sequence=1)
    if connection.vendor == "postgresql":
        with pytest.raises(DatabaseError), transaction.atomic():
            AuditLog.objects.filter(pk=first.pk).update(action="TAMPERED")
        with pytest.raises(DatabaseError), transaction.atomic():
            AuditLog.objects.filter(pk=first.pk).delete()
        assert verify_audit_chain()[0]
        return

    AuditLog.objects.filter(pk=first.pk).update(action="TAMPERED")
    valid, message = verify_audit_chain()
    assert not valid and "Invalid audit hash" in message

    AuditLog.objects.filter(pk=first.pk).update(action="READ")
    assert verify_audit_chain()[0]
    AuditLog.objects.filter(pk=first.pk).delete()
    valid, message = verify_audit_chain()
    assert not valid and "Broken audit chain" in message
