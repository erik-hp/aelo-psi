from django.conf import settings
from django.db import models
from services.security.models import SoftDeleteModel, TimestampedModel


class PatientStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    ARCHIVED = "ARCHIVED", "Archived"
    INACTIVE = "INACTIVE", "Inactive"


class Patient(SoftDeleteModel):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.PROTECT, related_name="patients")
    internal_code = models.CharField(max_length=64)
    display_name = models.CharField(max_length=180)
    status = models.CharField(max_length=32, choices=PatientStatus.choices, default=PatientStatus.ACTIVE, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_patients")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["clinic", "internal_code"], name="uniq_patient_code_per_clinic"),
        ]
        indexes = [
            models.Index(fields=["clinic", "status"]),
            models.Index(fields=["display_name"]),
            models.Index(fields=["deleted_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.internal_code} - {self.display_name}"


class PatientAccess(TimestampedModel):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="access_grants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="patient_access")
    can_edit = models.BooleanField(default=False)
    granted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="patient_access_granted")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["patient", "user"], name="uniq_patient_access_user"),
        ]
        indexes = [models.Index(fields=["patient", "user"])]
