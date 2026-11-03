from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.audit_logs.integrity import append_audit_log
from apps.users.models import UserSigningKey


class Command(BaseCommand):
    help = "Manually reset one clinician's signing key after identity verification."

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument("--apply", action="store_true", help="Remove the registered public key.")

    def handle(self, *args, **options):
        key = UserSigningKey.objects.select_related("user").filter(user__username=options["username"]).first()
        if key is None:
            raise CommandError("No signing key is registered for this user.")
        if not options["apply"]:
            self.stdout.write(f"Dry run: reset key {key.fingerprint} for {key.user.username}.")
            return
        with transaction.atomic():
            append_audit_log(
                user=None, action="SIGNING_KEY_RESET", entity="User", entity_id=str(key.user_id),
                ip_address=None, user_agent="reset_signing_key", metadata={"fingerprint": key.fingerprint},
            )
            key.delete()
        self.stdout.write(self.style.SUCCESS("Signing key reset. Existing signed reviews retain their public-key snapshots."))
