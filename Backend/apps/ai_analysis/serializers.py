from rest_framework import serializers
from .models import AIAnalysis, AISource, HumanValidation, SentimentMetric, VaultCheckpoint, VaultEdge, VaultNode


class VaultNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaultNode
        fields = ("id", "kind", "label", "mention_count", "weight", "first_seen_at", "last_seen_at")
        read_only_fields = fields


class VaultEdgeSerializer(serializers.ModelSerializer):
    note_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = VaultEdge
        fields = ("id", "source", "target", "relation", "evidence", "note_id", "observed_at", "confidence", "weight")
        read_only_fields = fields


class VaultCheckpointSummarySerializer(serializers.ModelSerializer):
    analysis_id = serializers.UUIDField(read_only=True)
    review_status = serializers.CharField(source="analysis.status", read_only=True)
    reviewed_by = serializers.SerializerMethodField()
    reviewed_at = serializers.SerializerMethodField()

    class Meta:
        model = VaultCheckpoint
        fields = ("id", "analysis_id", "review_status", "reviewed_by", "reviewed_at", "node_count", "edge_count", "created_at")
        read_only_fields = fields

    def get_reviewed_by(self, obj):
        validation = getattr(obj.analysis, "human_validation", None)
        return str(validation.reviewed_by_id) if validation else None

    def get_reviewed_at(self, obj):
        validation = getattr(obj.analysis, "human_validation", None)
        return validation.created_at if validation else None


class VaultCheckpointDetailSerializer(serializers.ModelSerializer):
    review_status = serializers.CharField(source="analysis.status", read_only=True)

    class Meta:
        model = VaultCheckpoint
        fields = ("id", "markdown", "content_sha256", "review_status")
        read_only_fields = fields


class AISourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISource
        fields = ("id", "session", "note", "excerpt", "relevance_score")
        read_only_fields = fields


class SentimentMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = SentimentMetric
        fields = ("id", "label", "value", "metadata")
        read_only_fields = fields


class HumanValidationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HumanValidation
        fields = ("id", "reviewed_by", "decision", "comment", "created_at")
        read_only_fields = fields


class AIAnalysisSerializer(serializers.ModelSerializer):
    sources = AISourceSerializer(many=True, read_only=True)
    sentiment_metrics = SentimentMetricSerializer(many=True, read_only=True)
    human_validation = HumanValidationSerializer(read_only=True)

    class Meta:
        model = AIAnalysis
        fields = (
            "id",
            "patient",
            "note",
            "requested_by",
            "status",
            "patterns",
            "longitudinal_evolution",
            "attention_points",
            "narrative_metrics",
            "behavioral_changes",
            "longitudinal_coherence",
            "possible_inconsistencies",
            "relevance_score",
            "sources",
            "sentiment_metrics",
            "human_validation",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AnalysisRequestSerializer(serializers.Serializer):
    patient = serializers.UUIDField()
    note = serializers.UUIDField(required=False)
    context_limit = serializers.IntegerField(min_value=1, max_value=20, default=10)


class ReviewSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)
    signature = serializers.CharField()


class SigningPayloadSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("VALIDATED", "REJECTED"))
    comment = serializers.CharField(required=False, allow_blank=True)
