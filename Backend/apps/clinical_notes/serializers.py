from rest_framework import serializers
from services.security.anonymization import anonymize_text
from .models import ClinicalNote


class ClinicalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalNote
        fields = (
            "id",
            "patient",
            "session",
            "author",
            "raw_text",
            "anonymized_text",
            "version",
            "locked_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "author", "anonymized_text", "version", "locked_at", "created_at", "updated_at")

    def validate(self, attrs):
        session = attrs.get("session") or getattr(self.instance, "session", None)
        patient = attrs.get("patient") or getattr(self.instance, "patient", None)
        if session and patient and session.patient_id != patient.id:
            raise serializers.ValidationError("Session does not belong to the selected patient.")
        return attrs

    def create(self, validated_data):
        patient = validated_data["patient"]
        validated_data["anonymized_text"] = anonymize_text(
            validated_data["raw_text"],
            display_name=patient.display_name,
            internal_code=patient.internal_code,
        )
        return super().create(validated_data)
