"""Purge soft-deleted patients after an operator-approved retention period."""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.ai_analysis.models import AIAnalysis, NoteExtractionJob, VaultCheckpoint, VaultEdge, VaultNode, VaultJob, AnalysisJob
from apps.audit_logs.integrity import append_audit_log
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import Patient
from apps.therapy_sessions.models import TherapySession


class Command(BaseCommand):
    help = "List expired soft-deleted patients, or permanently purge them with --apply."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Permanently delete eligible clinical records.")

    def handle(self, *args, **options):
        days = settings.CLINICAL_RETENTION_DAYS
        if days <= 0:
            raise CommandError("Set CLINICAL_RETENTION_DAYS to an approved positive period before running retention.")
        cutoff = timezone.now() - timedelta(days=days)
        patient_ids = list(Patient.objects.filter(deleted_at__lte=cutoff).order_by("deleted_at").values_list("id", flat=True))
        if not options["apply"]:
            self.stdout.write(f"Dry run: {len(patient_ids)} soft-deleted patients would be purged after {days} days.")
            return
        purged = 0
        for patient_id in patient_ids:
            with transaction.atomic():
                patient = Patient.objects.select_for_update().filter(pk=patient_id, deleted_at__lte=cutoff).first()
                if patient is None:
                    continue
                analysis_count = AIAnalysis.objects.filter(patient=patient).count()
                note_count = ClinicalNote.objects.filter(patient=patient).count()
                session_count = TherapySession.objects.filter(patient=patient).count()
                append_audit_log(
                    user=None, action="RETENTION_PURGE", entity="Patient", entity_id=str(patient.id),
                    ip_address=None, user_agent="purge_expired_patients",
                    metadata={"analyses": analysis_count, "notes": note_count, "sessions": session_count, "retention_days": days},
                )
                VaultCheckpoint.objects.filter(patient=patient).delete()
                VaultEdge.objects.filter(patient=patient).delete()
                VaultNode.objects.filter(patient=patient).delete()
                VaultJob.objects.filter(analysis__patient=patient).delete()
                NoteExtractionJob.objects.filter(note__patient=patient).delete()
                AnalysisJob.objects.filter(patient=patient).update(result=None)
                AIAnalysis.objects.filter(patient=patient).delete()
                AnalysisJob.objects.filter(patient=patient).delete()
                ClinicalNote.objects.filter(patient=patient).delete()
                TherapySession.objects.filter(patient=patient).delete()
                patient.delete()
                purged += 1
        self.stdout.write(self.style.SUCCESS(f"Permanently purged {purged} patients and their clinical records."))
