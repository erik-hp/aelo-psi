from django.conf import settings
from django.db import models
from services.security.models import TimestampedModel


class AnalysisStatus(models.TextChoices):
    PENDING_REVIEW = "PENDING_REVIEW", "Pending review"
    VALIDATED = "VALIDATED", "Validated"
    REJECTED = "REJECTED", "Rejected"


class AIAnalysis(TimestampedModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="ai_analyses")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_ai_analyses")
    note = models.ForeignKey("clinical_notes.ClinicalNote", null=True, blank=True, on_delete=models.PROTECT, related_name="ai_analyses")
    status = models.CharField(max_length=32, choices=AnalysisStatus.choices, default=AnalysisStatus.PENDING_REVIEW, db_index=True)
    patterns = models.JSONField(default=list, blank=True)
    longitudinal_evolution = models.TextField(blank=True)
    attention_points = models.JSONField(default=list, blank=True)
    narrative_metrics = models.JSONField(default=dict, blank=True)
    behavioral_changes = models.JSONField(default=list, blank=True)
    longitudinal_coherence = models.TextField(blank=True)
    possible_inconsistencies = models.JSONField(default=list, blank=True)
    relevance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    raw_response = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [models.Index(fields=["patient", "status"]), models.Index(fields=["requested_by", "created_at"])]


class AISource(TimestampedModel):
    analysis = models.ForeignKey(AIAnalysis, on_delete=models.CASCADE, related_name="sources")
    session = models.ForeignKey("therapy_sessions.TherapySession", null=True, blank=True, on_delete=models.SET_NULL)
    note = models.ForeignKey("clinical_notes.ClinicalNote", null=True, blank=True, on_delete=models.SET_NULL)
    excerpt = models.TextField(blank=True)
    relevance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)


class HumanValidation(TimestampedModel):
    analysis = models.OneToOneField(AIAnalysis, on_delete=models.CASCADE, related_name="human_validation")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    decision = models.CharField(max_length=32, choices=AnalysisStatus.choices)
    comment = models.TextField(blank=True)


class SentimentMetric(TimestampedModel):
    analysis = models.ForeignKey(AIAnalysis, on_delete=models.CASCADE, related_name="sentiment_metrics")
    label = models.CharField(max_length=80)
    value = models.DecimalField(max_digits=7, decimal_places=4)
    metadata = models.JSONField(default=dict, blank=True)
