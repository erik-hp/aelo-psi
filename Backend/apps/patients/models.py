from django.conf import settings
from django.core.exceptions import ValidationError
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

    def clean(self):
        super().clean()
        if not (self.patient_id and self.user_id and self.granted_by_id):
            return
        patient = self.patient
        beneficiary = self.user
        granter = self.granted_by
        if (
            not patient.clinic.is_active
            or patient.deleted_at is not None
            or not beneficiary.is_active
            or not granter.is_active
            or beneficiary.clinic_id != patient.clinic_id
            or granter.clinic_id != patient.clinic_id
        ):
            raise ValidationError("Patient access must stay inside one active clinic.")

        from apps.users.models import UserRole
        active_editor = PatientAccess.objects.filter(
            patient_id=patient.pk, user_id=granter.pk, can_edit=True,
        ).exclude(pk=self.pk).exists()
        bootstrap_self = (
            granter.role == UserRole.PSYCHOLOGIST
            and granter.pk == beneficiary.pk == patient.created_by_id
            and self.can_edit
            and not PatientAccess.objects.filter(patient_id=patient.pk).exclude(pk=self.pk).exists()
        )
        grantor_is_clinician = granter.role == UserRole.PSYCHOLOGIST and (active_editor or bootstrap_self)
        initial_admin_assignment = (
            granter.is_admin_role
            and patient.created_by_id == granter.pk
            and beneficiary.role == UserRole.PSYCHOLOGIST
            and self.can_edit
            and not PatientAccess.objects.filter(patient_id=patient.pk).exclude(pk=self.pk).exists()
        )
        if not (grantor_is_clinician or initial_admin_assignment):
            raise ValidationError("Only an authorized psychologist may delegate clinical access; an administrator may assign an initial psychologist.")

    def save(self, *args, **kwargs):
        # Validation must also apply to direct ORM writes, not only API forms.
        self.full_clean()
        return super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["patient", "user"], name="uniq_patient_access_user"),
        ]
        indexes = [models.Index(fields=["patient", "user"])]
