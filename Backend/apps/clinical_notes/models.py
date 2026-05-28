from django.conf import settings
from django.db import models
from services.security.models import SoftDeleteModel, TimestampedModel


class ClinicalNote(SoftDeleteModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="clinical_notes")
    session = models.ForeignKey("therapy_sessions.TherapySession", null=True, blank=True, on_delete=models.PROTECT, related_name="clinical_notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="clinical_notes")
    raw_text = models.TextField()
    anonymized_text = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["patient", "created_at"]), models.Index(fields=["author", "created_at"])]

    def __str__(self) -> str:
        return f"Note {self.id} v{self.version}"


class ClinicalNoteHistory(TimestampedModel):
    note = models.ForeignKey(ClinicalNote, on_delete=models.CASCADE, related_name="history")
    edited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    raw_text = models.TextField()
    anonymized_text = models.TextField(blank=True)
    version = models.PositiveIntegerField()

    class Meta:
        indexes = [models.Index(fields=["note", "version"])]
