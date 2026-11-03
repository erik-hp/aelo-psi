import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.clinics.models import Clinic
from apps.patients.models import Patient, PatientAccess, PatientStatus
from apps.therapy_sessions.models import SessionStatus, TherapySession
from apps.users.models import UserRole


class Command(BaseCommand):
    help = "Create synthetic local development data with an explicit admin password."

    def handle(self, *args, **options):
        password = os.getenv("AELO_SEED_ADMIN_PASSWORD", "")
        if len(password) < 12:
            raise CommandError("AELO_SEED_ADMIN_PASSWORD must contain at least 12 characters.")
        clinic, _ = Clinic.objects.get_or_create(name="AELO Clinic", defaults={"document": "00000000000000"})
        User = get_user_model()
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@aelo.local",
                "role": UserRole.ADMIN,
                "clinic": clinic,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password(password)
            admin.save()
        patient, _ = Patient.objects.get_or_create(
            clinic=clinic,
            internal_code="P-0001",
            defaults={
                "display_name": "Paciente Exemplo",
                "status": PatientStatus.ACTIVE,
                "created_by": admin,
            },
        )
        PatientAccess.objects.get_or_create(
            patient=patient,
            user=admin,
            defaults={"can_edit": True, "granted_by": admin},
        )
        summary = "Sessao inicial criada para validar a integracao com o frontend."
        # Encrypted text uses a fresh nonce; equality queries cannot match it.
        if not TherapySession.objects.filter(patient=patient, professional=admin, status=SessionStatus.COMPLETED).exists():
            TherapySession.objects.create(
                patient=patient,
                professional=admin,
                scheduled_at=timezone.now(),
                status=SessionStatus.COMPLETED,
                summary=summary,
            )
        self.stdout.write(self.style.SUCCESS("Seed completed. Admin username: admin"))
