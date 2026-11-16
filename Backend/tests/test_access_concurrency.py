"""PostgreSQL evidence for delegation/revocation races; all records are synthetic."""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Event

import pytest
from django.db import connection, connections, transaction
from rest_framework.test import APIClient

from apps.audit_logs.integrity import verify_audit_chain
from apps.audit_logs.models import AuditChainState
from apps.patients.models import Patient, PatientAccess
from apps.users.models import User, UserRole


@pytest.fixture(autouse=True)
def audit_chain_after_transactional_flush(db):
    # Transactional tests flush data migrations; restore this required singleton.
    AuditChainState.objects.get_or_create(pk=1)


def post_as(user, path, payload):
    try:
        client = APIClient()
        client.force_authenticate(user)
        return client.post(path, payload, format="json").status_code
    finally:
        connections.close_all()


@pytest.mark.django_db(transaction=True)
def test_concurrent_self_revocations_keep_one_responsible_psychologist(records):
    if connection.vendor != "postgresql":
        pytest.skip("Revocation row locking requires PostgreSQL")
    patient = records["patient"]
    barrier = Barrier(2)

    def revoke(user):
        barrier.wait(timeout=10)
        return post_as(user, f"/api/patients/{patient.pk}/revoke-access/", {"user": user.pk})

    with ThreadPoolExecutor(max_workers=2) as workers:
        futures = [workers.submit(revoke, records[actor]) for actor in ("owner", "editor")]
        assert sorted(future.result(timeout=20) for future in futures) == [204, 400]
    assert PatientAccess.objects.filter(patient=patient, can_edit=True, user__role=UserRole.PSYCHOLOGIST).count() == 1
    assert verify_audit_chain()[0]


@pytest.mark.django_db(transaction=True)
def test_waiting_delegation_rechecks_authority_after_revocation(records):
    if connection.vendor != "postgresql":
        pytest.skip("Delegation row locking requires PostgreSQL")
    patient = records["patient"]
    beneficiary = User.objects.create_user(
        username="synthetic-race-beneficiary", role=UserRole.PSYCHOLOGIST, clinic=records["clinic"],
    )
    waiting_for_lock = Event()

    def delegate():
        def observe_lock(execute, sql, params, many, context):
            if "FOR UPDATE" in sql and '"patients_patient"' in sql:
                waiting_for_lock.set()
            return execute(sql, params, many, context)

        with connection.execute_wrapper(observe_lock):
            return post_as(records["editor"], f"/api/patients/{patient.pk}/grant-access/", {
                "user": beneficiary.pk, "can_edit": False,
            })

    with ThreadPoolExecutor(max_workers=1) as workers:
        with transaction.atomic():
            Patient.objects.select_for_update().get(pk=patient.pk)
            pending = workers.submit(delegate)
            assert waiting_for_lock.wait(timeout=10)
            client = APIClient()
            client.force_authenticate(records["owner"])
            response = client.post(f"/api/patients/{patient.pk}/revoke-access/", {"user": records["editor"].pk})
            assert response.status_code == 204
        assert pending.result(timeout=20) == 403
    assert not PatientAccess.objects.filter(patient=patient, user=beneficiary).exists()
    assert not PatientAccess.objects.filter(patient=patient, user=records["editor"]).exists()
    assert verify_audit_chain()[0]
