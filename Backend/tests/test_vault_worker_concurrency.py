"""The PostgreSQL queue must not execute one checkpoint twice concurrently."""

from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest
from django.db import connection, connections

from apps.ai_analysis.jobs import process_next_job
from apps.ai_analysis.models import AIAnalysis, VaultJob


@pytest.mark.django_db(transaction=True)
def test_two_workers_do_not_process_the_same_checkpoint(records, monkeypatch):
    if connection.vendor != "postgresql":
        pytest.skip("Row-level queue locking requires PostgreSQL")

    patient, note, owner = (records[key] for key in ("patient", "note", "owner"))
    analysis = AIAnalysis.objects.create(patient=patient, note=note, note_version=note.version, requested_by=owner)
    job = VaultJob.objects.create(analysis=analysis)
    started = Event()
    release = Event()
    calls = []

    def slow_checkpoint(target):
        calls.append(target.pk)
        started.set()
        assert release.wait(timeout=10)

    monkeypatch.setattr("apps.ai_analysis.jobs.create_checkpoint", slow_checkpoint)

    def run_worker():
        try:
            return process_next_job()
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as workers:
        first = workers.submit(run_worker)
        try:
            assert started.wait(timeout=10)
            second = workers.submit(run_worker)
            assert second.result(timeout=10) is False
        finally:
            release.set()
        assert first.result(timeout=10) is True

    job.refresh_from_db()
    assert job.status == VaultJob.Status.COMPLETED
    assert calls == [analysis.pk]
