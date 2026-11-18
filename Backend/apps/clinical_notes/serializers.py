from rest_framework import serializers
from services.security.anonymization import anonymize_text
from .models import ClinicalNote, ClinicalNoteHistory
from apps.patients.access import accessible_patients, can_access_patient
from apps.therapy_sessions.models import TherapySession


class ClinicalNoteSerializer(serializers.ModelSerializer):
    expected_version = serializers.IntegerField(write_only=True, required=False, min_value=1)

    def get_fields(self):
        fields = super().get_fields()
        user = getattr(self.context.get("request"), "user", None)
        patients = accessible_patients(user, clinical=True, write=True)
        fields["patient"].queryset = patients
        fields["session"].queryset = TherapySession.objects.filter(
            patient__in=patients, professional_id=getattr(user, "pk", None), deleted_at__isnull=True,
        )
        return fields

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
            "status",
            "expected_version",
            "locked_at",
            "signed_by",
            "signed_at",
            "signed_payload_sha256",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "author",
            "anonymized_text",
            "version",
            "status",
            "locked_at",
            "signed_by",
            "signed_at",
            "signed_payload_sha256",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        if not self.instance and "expected_version" in attrs:
            raise serializers.ValidationError({"expected_version": "Use version checks only when updating a note."})
        if self.instance:
            if "patient" in attrs and attrs["patient"].pk != self.instance.patient_id:
                raise serializers.ValidationError({"patient": "The note's patient cannot be changed."})
            if "session" in attrs and getattr(attrs["session"], "pk", None) != self.instance.session_id:
                raise serializers.ValidationError({"session": "The note's session cannot be changed."})
        session = attrs.get("session") or getattr(self.instance, "session", None)
        patient = attrs.get("patient") or getattr(self.instance, "patient", None)
        if session and patient and session.patient_id != patient.id:
            raise serializers.ValidationError("Session does not belong to the selected patient.")
        if session is not None:
            if session.deleted_at is not None:
                raise serializers.ValidationError("Notes cannot reference a deleted session.")
            if session.professional_id != self.context["request"].user.pk:
                # Existing notes are also authored by the session's professional.
                # Cross-professional entries require a separate, reviewed workflow.
                raise serializers.ValidationError("Only the session professional may author its notes.")
        request = self.context['request']
        if self.instance and 'patient' in attrs and attrs['patient'].id != self.instance.patient_id:
            raise serializers.ValidationError('Não é permitido transferir notas entre pacientes.')
        if self.instance and "session" in attrs:
            new_session_id = attrs["session"].pk if attrs["session"] is not None else None
            if new_session_id != self.instance.session_id:
                raise serializers.ValidationError("A nota não pode ser movida entre sessões.")
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


class NoteSigningPayloadSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["SIGN", "AMEND"], default="SIGN")
    raw_text = serializers.CharField(required=False, max_length=50000)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class NoteSignSerializer(serializers.Serializer):
    signature = serializers.CharField(max_length=128)


class NoteAmendSerializer(serializers.Serializer):
    raw_text = serializers.CharField(min_length=1, max_length=50000)
    reason = serializers.CharField(min_length=10, max_length=2000)
    signature = serializers.CharField(max_length=128)


class ClinicalNoteHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalNoteHistory
        fields = (
            "id",
            "version",
            "edited_by",
            "raw_text",
            "status_at_archive",
            "amendment_reason",
            "created_at",
        )
        read_only_fields = fields
