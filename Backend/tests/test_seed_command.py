import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.therapy_sessions.models import TherapySession
from apps.users.models import User


@pytest.mark.django_db
def test_seed_requires_explicit_password_and_is_idempotent(monkeypatch):
    monkeypatch.delenv("AELO_SEED_ADMIN_PASSWORD", raising=False)
    with pytest.raises(CommandError):
        call_command("seed_initial_data")
    assert not User.objects.filter(username="admin").exists()

    monkeypatch.setenv("AELO_SEED_ADMIN_PASSWORD", "unique-test-password-123")
    call_command("seed_initial_data")
    call_command("seed_initial_data")

    admin = User.objects.get(username="admin")
    assert admin.check_password("unique-test-password-123")
    assert TherapySession.objects.filter(professional=admin).count() == 1
