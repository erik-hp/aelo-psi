from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.ai_analysis.retrieval import queue_note_extraction
from apps.clinical_notes.models import ClinicalNote


class Command(BaseCommand):
    help = "Queue automatic reading of existing notes in a synthetic environment."

    def handle(self, *args, **options):
        if not settings.AI_AUTO_EXTRACTION:
            raise CommandError("AI_AUTO_EXTRACTION is disabled.")
        notes = ClinicalNote.objects.filter(deleted_at__isnull=True).order_by("created_at", "id")
        total = 0
        for note in notes.iterator():
            queue_note_extraction(note)
            total += 1
        self.stdout.write(f"Notes checked: {total}")
