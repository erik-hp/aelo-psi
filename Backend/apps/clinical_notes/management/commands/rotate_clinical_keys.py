"""Re-encrypt clinical fields under the first configured AES-256 key."""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.test import override_settings

from apps.ai_analysis.models import AIAnalysis, AISource, HumanValidation, SentimentMetric
from apps.audit_logs.integrity import append_audit_log
from apps.clinical_notes.models import ClinicalNote, ClinicalNoteHistory
from apps.therapy_sessions.models import TherapySession


ENCRYPTED_MODELS = (
    (ClinicalNote, ("raw_text", "anonymized_text")),
    (ClinicalNoteHistory, ("raw_text", "anonymized_text")),
    (TherapySession, ("summary",)),
    (AIAnalysis, ("patterns", "longitudinal_evolution", "attention_points", "narrative_metrics", "behavioral_changes", "longitudinal_coherence", "possible_inconsistencies", "raw_response")),
    (AISource, ("excerpt",)),
    (HumanValidation, ("comment",)),
    (SentimentMetric, ("metadata",)),
)


class Command(BaseCommand):
    help = "Dry-run or re-encrypt clinical fields using the first CLINICAL_DATA_KEYS key."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Rewrite every encrypted record under the primary key.")

    def handle(self, *args, **options):
        if len(settings.CLINICAL_DATA_KEYS) < 2:
            raise CommandError("Prepend a new key and retain the old key before rotating records.")
        counts = {model.__name__: model.objects.count() for model, _ in ENCRYPTED_MODELS}
        total = sum(counts.values())
        if not options["apply"]:
            self.stdout.write(f"Dry run: {total} encrypted records would be rewritten. Keep old keys until verification passes.")
            return
        for model, fields in ENCRYPTED_MODELS:
            for instance in model.objects.iterator(chunk_size=100):
                instance.save(update_fields=list(fields))
        try:
            with override_settings(CLINICAL_DATA_KEYS=[settings.CLINICAL_DATA_KEYS[0]]):
                for model, fields in ENCRYPTED_MODELS:
                    for instance in model.objects.iterator(chunk_size=100):
                        for field in fields:
                            getattr(instance, field)
        except ValueError as exc:
            raise CommandError("At least one record still needs an old key; do not remove it.") from exc
        append_audit_log(
            user=None, action="CLINICAL_KEY_ROTATION", entity="ClinicalData", entity_id="",
            ip_address=None, user_agent="rotate_clinical_keys", metadata={"records": counts},
        )
        self.stdout.write(self.style.SUCCESS(f"Re-encrypted and verified {total} clinical records under the primary key."))
