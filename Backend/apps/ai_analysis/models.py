from django.conf import settings
from django.db import models
from services.security.models import TimestampedModel
from services.security.encrypted_fields import EncryptedJSONField, EncryptedTextField
from pgvector.django import VectorField


class AnalysisStatus(models.TextChoices):
    PENDING_REVIEW = "PENDING_REVIEW", "Pending review"
    VALIDATED = "VALIDATED", "Validated"
    REJECTED = "REJECTED", "Rejected"


class AIAnalysis(TimestampedModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="ai_analyses")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_ai_analyses")
    note = models.ForeignKey("clinical_notes.ClinicalNote", null=True, blank=True, on_delete=models.PROTECT, related_name="ai_analyses")
    note_version = models.PositiveIntegerField(null=True, blank=True)
    job = models.OneToOneField("ai_analysis.AnalysisJob", null=True, blank=True, on_delete=models.PROTECT, related_name="completed_analysis")
    status = models.CharField(max_length=32, choices=AnalysisStatus.choices, default=AnalysisStatus.PENDING_REVIEW, db_index=True)
    patterns = EncryptedJSONField(default=list, blank=True)
    longitudinal_evolution = EncryptedTextField(blank=True)
    attention_points = EncryptedJSONField(default=list, blank=True)
    narrative_metrics = EncryptedJSONField(default=dict, blank=True)
    behavioral_changes = EncryptedJSONField(default=list, blank=True)
    longitudinal_coherence = EncryptedTextField(blank=True)
    possible_inconsistencies = EncryptedJSONField(default=list, blank=True)
    relevance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    raw_response = EncryptedJSONField(default=dict, blank=True)

    class Meta:
        indexes = [models.Index(fields=["patient", "status"]), models.Index(fields=["requested_by", "created_at"])]


class AISource(TimestampedModel):
    analysis = models.ForeignKey(AIAnalysis, on_delete=models.CASCADE, related_name="sources")
    session = models.ForeignKey("therapy_sessions.TherapySession", null=True, blank=True, on_delete=models.SET_NULL)
    note = models.ForeignKey("clinical_notes.ClinicalNote", null=True, blank=True, on_delete=models.SET_NULL)
    excerpt = EncryptedTextField(blank=True)
    relevance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)


class HumanValidation(TimestampedModel):
    analysis = models.OneToOneField(AIAnalysis, on_delete=models.CASCADE, related_name="human_validation")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    decision = models.CharField(max_length=32, choices=AnalysisStatus.choices)
    comment = EncryptedTextField(blank=True)
    signature = models.CharField(max_length=128, blank=True)
    public_key_spki = models.TextField(blank=True)
    signed_payload_sha256 = models.CharField(max_length=64, blank=True)


class SentimentMetric(TimestampedModel):
    analysis = models.ForeignKey(AIAnalysis, on_delete=models.CASCADE, related_name="sentiment_metrics")
    label = models.CharField(max_length=80)
    value = models.DecimalField(max_digits=7, decimal_places=4)
    metadata = EncryptedJSONField(default=dict, blank=True)


class VaultNode(TimestampedModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="vault_nodes")
    fingerprint = models.CharField(max_length=64)
    kind = models.CharField(max_length=32)
    label = EncryptedTextField()
    mention_count = models.PositiveIntegerField(default=1)
    weight = models.DecimalField(max_digits=8, decimal_places=3, default=1)
    embedding = VectorField(null=True, blank=True)
    first_seen_at = models.DateTimeField()
    last_seen_at = models.DateTimeField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["patient", "fingerprint"], name="uniq_vault_node_patient_fingerprint")]
        indexes = [models.Index(fields=["patient", "kind"])]


class VaultEdge(TimestampedModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="vault_edges")
    source = models.ForeignKey(VaultNode, on_delete=models.PROTECT, related_name="outgoing_edges")
    target = models.ForeignKey(VaultNode, on_delete=models.PROTECT, related_name="incoming_edges")
    note = models.ForeignKey("clinical_notes.ClinicalNote", on_delete=models.PROTECT)
    relation = models.CharField(max_length=32)
    evidence = EncryptedTextField()
    observed_at = models.DateTimeField()
    confidence = models.DecimalField(max_digits=4, decimal_places=3, default=0)
    weight = models.DecimalField(max_digits=4, decimal_places=3, default=0)

    class Meta:
        indexes = [models.Index(fields=["patient", "observed_at"])]


class VaultCheckpoint(TimestampedModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="vault_checkpoints")
    analysis = models.OneToOneField(AIAnalysis, on_delete=models.PROTECT, related_name="vault_checkpoint")
    markdown = EncryptedTextField()
    content_sha256 = models.CharField(max_length=64)
    node_count = models.PositiveIntegerField(default=0)
    edge_count = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=["patient", "created_at"])]


class VaultJob(TimestampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    analysis = models.OneToOneField(AIAnalysis, on_delete=models.PROTECT, related_name="vault_job")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=64, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status", "created_at"])]


class NoteExtractionJob(TimestampedModel):
    """One automatic reading of one note version; see ADR-003."""

    note = models.ForeignKey("clinical_notes.ClinicalNote", on_delete=models.PROTECT, related_name="extraction_jobs")
    note_version = models.PositiveIntegerField()
    status = models.CharField(max_length=16, choices=VaultJob.Status.choices, default=VaultJob.Status.PENDING, db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=64, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["note", "note_version"], name="uniq_extraction_note_version")]
        indexes = [models.Index(fields=["status", "created_at"])]


class AnalysisJob(TimestampedModel):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    note = models.ForeignKey("clinical_notes.ClinicalNote", null=True, on_delete=models.PROTECT)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    context_limit = models.PositiveSmallIntegerField(default=10)
    status = models.CharField(max_length=16, choices=VaultJob.Status.choices, default=VaultJob.Status.PENDING, db_index=True)
    result = models.OneToOneField(AIAnalysis, null=True, blank=True, on_delete=models.PROTECT)
    attempts = models.PositiveSmallIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=64, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status", "created_at"])]
