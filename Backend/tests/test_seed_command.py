import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.therapy_sessions.models import TherapySession
from apps.clinics.models import Clinic
from apps.users.models import User


@pytest.mark.django_db
def test_seed_requires_explicit_opt_in_and_existing_admin(monkeypatch):
    monkeypatch.delenv("AELO_ALLOW_SYNTHETIC_SEED", raising=False)
    with pytest.raises(CommandError):
        call_command("seed_initial_data", admin_username="admin")
    assert not User.objects.filter(username="admin").exists()

    monkeypatch.setenv("AELO_ALLOW_SYNTHETIC_SEED", "1")
    with pytest.raises(CommandError):
        call_command("seed_initial_data", admin_username="admin")
    clinic = Clinic.objects.create(name="Clínica sintética")
    admin = User.objects.create_superuser(username="admin", password="unique-test-password-123", clinic=clinic)
    call_command("seed_initial_data", admin_username="admin")
    call_command("seed_initial_data", admin_username="admin")

    assert admin.check_password("unique-test-password-123")
    assert TherapySession.objects.filter(professional=admin).count() == 1
