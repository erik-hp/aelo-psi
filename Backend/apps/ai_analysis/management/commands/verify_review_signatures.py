from django.core.management.base import BaseCommand, CommandError

from apps.ai_analysis.models import HumanValidation
from apps.ai_analysis.signatures import verify_validation


class Command(BaseCommand):
    help = "Verify clinician signatures against the current persisted AI result."

    def handle(self, *args, **options):
        invalid = []
        count = 0
        for validation in HumanValidation.objects.select_related("analysis").iterator():
            count += 1
            if not verify_validation(validation):
                invalid.append(str(validation.id))
        if invalid:
            raise CommandError(f"Invalid or legacy unsigned reviews: {', '.join(invalid[:20])} ({len(invalid)} total).")
        self.stdout.write(self.style.SUCCESS(f"Verified {count} review signatures."))
