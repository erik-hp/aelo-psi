import time

from django.core.management.base import BaseCommand

from apps.ai_analysis.jobs import process_next_job, process_next_analysis_job


class Command(BaseCommand):
    help = "Process queued Vault checkpoints outside HTTP workers."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true")

    def handle(self, *args, **options):
        while True:
            processed = process_next_analysis_job() or process_next_job()
            if options["once"]:
                return
            if not processed:
                time.sleep(2)
