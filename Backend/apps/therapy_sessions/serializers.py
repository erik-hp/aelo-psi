from rest_framework import serializers
from apps.patients.models import Patient
from apps.patients.access import can_access_patient
from .models import TherapySession


class TherapySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TherapySession
        fields = (
            "id",
            "patient",
            "professional",
            "scheduled_at",
            "started_at",
            "ended_at",
            "status",
            "summary",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "professional", "created_at", "updated_at")

    def validate_patient(self, patient: Patient):
        request = self.context["request"]
        if not can_access_patient(request.user, patient, clinical=True, write=True):
            raise serializers.ValidationError("Patient is not accessible by this user.")
        return patient

    def validate(self, attrs):
        if self.instance and 'patient' in attrs and attrs['patient'].pk != self.instance.patient_id:
            raise serializers.ValidationError('Não é permitido transferir uma sessão para outro paciente.')
        return attrs
