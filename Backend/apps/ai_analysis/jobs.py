"""Database-backed Vault work queue; inference runs outside HTTP workers."""

from datetime import timedelta

from django.db import connection, transaction
from django.utils import timezone

from apps.patients.access import can_edit_patient

from .models import AIAnalysis, AnalysisJob, NoteExtractionJob, VaultCheckpoint, VaultJob
from .services import request_ai_analysis
from .vault import SupersededNote, create_checkpoint, refresh_note_graph


def _claim_job(model):
    with transaction.atomic():
        stale = timezone.now() - timedelta(minutes=10)
        model.objects.filter(
            status=VaultJob.Status.RUNNING, started_at__lt=stale, attempts__gte=3
        ).update(status=VaultJob.Status.FAILED, error_code="WorkerTimeout")
        queryset = model.objects.filter(
            status=VaultJob.Status.PENDING
        ) | model.objects.filter(
            status=VaultJob.Status.RUNNING, started_at__lt=stale, attempts__lt=3
        )
        if connection.features.has_select_for_update_skip_locked:
            queryset = queryset.select_for_update(skip_locked=True)
        else:
            queryset = queryset.select_for_update()
        job = queryset.order_by("created_at").first()
        if job is None:
            return None
        job.status = VaultJob.Status.RUNNING
        job.attempts += 1
        job.started_at = timezone.now()
        job.error_code = ""
        job.save(
            update_fields=[
                "status",
                "attempts",
                "started_at",
                "error_code",
                "updated_at",
            ]
        )
        return job.pk


def claim_job():
    return _claim_job(VaultJob)


def process_next_job():
    job_id = claim_job()
    if job_id is None:
        return False
    job = VaultJob.objects.select_related(
        "analysis", "analysis__patient", "analysis__note"
    ).get(pk=job_id)
    try:
        if not job.analysis.requested_by.is_active or not can_edit_patient(
            job.analysis.requested_by, job.analysis.patient
        ):
            raise PermissionError("Patient edit access was revoked")
        if not VaultCheckpoint.objects.filter(analysis=job.analysis).exists():
            create_checkpoint(job.analysis)
    except Exception as exc:
        # Clinical text and exception messages must not enter operational logs.
        job.status = VaultJob.Status.FAILED
        job.error_code = type(exc).__name__[:64]
    else:
        job.status = VaultJob.Status.COMPLETED
    job.save(update_fields=["status", "error_code", "updated_at"])
    return True


def process_next_extraction_job():
    job_id = _claim_job(NoteExtractionJob)
    if job_id is None:
        return False
    job = NoteExtractionJob.objects.select_related("note", "note__patient", "note__author").get(pk=job_id)
    note = job.note
    job.status = VaultJob.Status.COMPLETED
    try:
        if note.deleted_at is not None or note.version != job.note_version:
            raise SupersededNote()
        if not note.author.is_active or not can_edit_patient(note.author, note.patient):
            raise PermissionError("Patient edit access was revoked")
        refresh_note_graph(note, job.note_version)
    except SupersededNote:
        job.error_code = "SupersededNote"
    except Exception as exc:
        # Clinical text and exception messages must not enter operational logs.
        job.status = VaultJob.Status.FAILED
        job.error_code = type(exc).__name__[:64]
    job.save(update_fields=["status", "error_code", "updated_at"])
    return True


def process_next_analysis_job():
    job_id = _claim_job(AnalysisJob)
    if job_id is None:
        return False
    job = AnalysisJob.objects.select_related("patient", "note", "requested_by").get(
        pk=job_id
    )
    try:
        if not job.requested_by.is_active or not can_edit_patient(
            job.requested_by, job.patient
        ):
            raise PermissionError("Patient edit access was revoked")
        if job.note and (job.note.deleted_at or job.note.patient_id != job.patient_id):
            raise ValueError("Source note unavailable")
        result = AIAnalysis.objects.filter(job=job).first()
        if result is None:
            result = request_ai_analysis(
                patient=job.patient,
                note=job.note,
                user=job.requested_by,
                context_limit=job.context_limit,
                job=job,
            )
    except Exception as exc:
        job.status = VaultJob.Status.FAILED
        job.error_code = type(exc).__name__[:64]
    else:
        job.status = VaultJob.Status.COMPLETED
        job.result = result
    job.save(update_fields=["status", "result", "error_code", "updated_at"])
    return True
