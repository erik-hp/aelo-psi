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
        scheduled_at = attrs.get("scheduled_at", getattr(self.instance, "scheduled_at", None))
        status = attrs.get("status", getattr(self.instance, "status", "SCHEDULED"))
        if scheduled_at and status not in {"CANCELLED", "MISSED"}:
            conflicts = TherapySession.objects.filter(
                professional=self.context["request"].user, scheduled_at=scheduled_at, deleted_at__isnull=True,
            ).exclude(status__in=["CANCELLED", "MISSED"])
            if self.instance:
                conflicts = conflicts.exclude(pk=self.instance.pk)
            if conflicts.exists():
                raise serializers.ValidationError({"scheduled_at": "Já existe um atendimento neste horário para este profissional."})
        return attrs
