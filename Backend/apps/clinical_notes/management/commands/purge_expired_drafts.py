"""Remove clinical drafts after their 30-day inactivity period."""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.clinical_notes.models import ClinicalNoteDraft


class Command(BaseCommand):
    help = "Purge expired encrypted clinical drafts."

    def handle(self, *args, **options):
        count, _ = ClinicalNoteDraft.objects.filter(expires_at__lte=timezone.now()).delete()
        self.stdout.write(f"Purged {count} expired clinical drafts.")
