from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    PSYCHOLOGIST = "PSYCHOLOGIST", "Psychologist"
    INTERN = "INTERN", "Intern"


class User(AbstractUser):
    role = models.CharField(max_length=32, choices=UserRole.choices, default=UserRole.INTERN, db_index=True)
    clinic = models.ForeignKey("clinics.Clinic", null=True, blank=True, on_delete=models.PROTECT, related_name="users")
    license_number = models.CharField(max_length=64, blank=True)
    is_active = models.BooleanField(default=True)

    @property
    def is_admin_role(self) -> bool:
        return self.role == UserRole.ADMIN or self.is_superuser

    @property
    def is_clinician(self) -> bool:
        return self.role in {UserRole.PSYCHOLOGIST, UserRole.INTERN}


class UserSigningKey(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="signing_key")
    public_key_spki = models.TextField()
    fingerprint = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
