from django.conf import settings
from django.db import models
from services.security.models import SoftDeleteModel
from services.security.encrypted_fields import EncryptedTextField


class SessionStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    MISSED = "MISSED", "Missed"


class TherapySession(SoftDeleteModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="therapy_sessions")
    professional = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="therapy_sessions")
    scheduled_at = models.DateTimeField(db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=SessionStatus.choices, default=SessionStatus.SCHEDULED, db_index=True)
    summary = EncryptedTextField(blank=True)

    class Meta:
        constraints = [
            # Closes the race between the serializer's conflict check and the insert.
            models.UniqueConstraint(
                fields=["professional", "scheduled_at"],
                condition=models.Q(deleted_at__isnull=True) & ~models.Q(status__in=["CANCELLED", "MISSED"]),
                name="uniq_active_session_slot_per_professional",
            ),
        ]
        indexes = [
            models.Index(fields=["patient", "scheduled_at"]),
            models.Index(fields=["professional", "scheduled_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.patient_id} - {self.scheduled_at:%Y-%m-%d %H:%M}"
