from rest_framework import serializers
from .models import AIAnalysis, AISource, HumanValidation, SentimentMetric


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
