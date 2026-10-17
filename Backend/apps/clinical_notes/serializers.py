from rest_framework import serializers
from services.security.anonymization import anonymize_text
from .models import ClinicalNote
from apps.patients.access import can_access_patient


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
        request = self.context['request']
        if self.instance and 'patient' in attrs and attrs['patient'].id != self.instance.patient_id:
            raise serializers.ValidationError('Não é permitido transferir notas entre pacientes.')
        if patient and not can_access_patient(request.user, patient, clinical=True, write=True):
            raise serializers.ValidationError('Paciente sem permissão de edição clínica.')
        return attrs

    def create(self, validated_data):
        patient = validated_data["patient"]
        validated_data["anonymized_text"] = anonymize_text(
            validated_data["raw_text"],
            display_name=patient.display_name,
            internal_code=patient.internal_code,
        )
        return super().create(validated_data)
