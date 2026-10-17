"""Explicit synthetic demo fixtures, never a default administrative password."""
import os
from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.clinics.models import Clinic
from apps.patients.models import Patient, PatientAccess, PatientStatus
from apps.therapy_sessions.models import SessionStatus, TherapySession


class Command(BaseCommand):
    help = "Populate synthetic development fixtures for an existing administrative user."

    def add_arguments(self, parser):
        parser.add_argument("--admin-username", required=True, help="Existing, manually provisioned clinic superuser")

    def handle(self, *args, **options):
        if os.getenv("AELO_ALLOW_SYNTHETIC_SEED") != "1":
            raise CommandError("Synthetic seed disabled. Set AELO_ALLOW_SYNTHETIC_SEED=1 explicitly for isolated development.")

        User = get_user_model()
        admin = User.objects.filter(username=options["admin_username"], is_superuser=True, is_active=True).select_related("clinic").first()
        if admin is None or admin.clinic_id is None:
            raise CommandError("Provide an existing, active superuser assigned to a clinic. No password is created by this command.")

        clinic = admin.clinic
        patient, _ = Patient.objects.get_or_create(
            clinic=clinic,
            internal_code="P-SYNTHETIC-0001",
            defaults={
                "display_name": "Pessoa Fictícia (TESTE)",
                "status": PatientStatus.ACTIVE,
                "created_by": admin,
            },
        )
        # Operational administrators never receive automatic clinical access.
        TherapySession.objects.get_or_create(
            patient=patient,
            professional=admin,
            scheduled_at=timezone.make_aware(datetime(2026, 1, 5, 14, 0)),
            defaults={
                "status": SessionStatus.COMPLETED,
                "summary": "Sessão sintética exclusivamente para validar integração.",
            },
        )
        self.stdout.write(self.style.SUCCESS("Synthetic seed completed. No user or password was created."))
