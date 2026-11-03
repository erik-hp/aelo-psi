"""Idempotent synthetic identities for the isolated security Compose stack."""

import os

from django.core.management.base import BaseCommand, CommandError

from apps.clinics.models import Clinic
from apps.patients.models import Patient
from apps.users.models import User, UserRole


class Command(BaseCommand):
    help = "Seed synthetic load and cross-clinic security fixtures. Never use in production."

    def handle(self, *args, **options):
        if os.getenv("AELO_SECURITY_SCENARIO") != "1":
            raise CommandError("Synthetic security seed is restricted to the isolated security stack.")
        for clinic_number in (1, 2):
            clinic, _ = Clinic.objects.get_or_create(
                name=f"Security Synthetic Clinic {clinic_number}",
                defaults={"document": f"{clinic_number:014d}"},
            )
            admin, created = User.objects.get_or_create(
                username=f"security{clinic_number}_admin",
                defaults={"clinic": clinic, "role": UserRole.ADMIN},
            )
            if created:
                admin.set_password("synthetic-only-password-2026")
                admin.save(update_fields=["password"])
            for number in range(1, 11):
                username = f"security{clinic_number}_{number}"
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={"clinic": clinic, "role": UserRole.PSYCHOLOGIST},
                )
                if created:
                    user.set_password("synthetic-only-password-2026")
                    user.save(update_fields=["password"])
                Patient.objects.get_or_create(
                    clinic=clinic, internal_code=f"S-{clinic_number}-{number}",
                    defaults={"display_name": f"Synthetic Patient {clinic_number}-{number}", "created_by": user},
                )
        self.stdout.write(self.style.SUCCESS("Synthetic security fixtures ready."))
