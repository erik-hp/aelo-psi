from datetime import timedelta
from django.conf import settings
from rest_framework import serializers
from apps.patients.models import Patient
from apps.patients.access import accessible_patients, can_access_patient
from .models import TherapySession


def session_window(scheduled_at, started_at=None, ended_at=None):
    duration = timedelta(minutes=getattr(settings, "SESSION_DURATION_MINUTES", 50))
    start = started_at or scheduled_at
    end = ended_at or (start + duration)
    return start, end


def has_overlapping_session(*, professional, scheduled_at, started_at=None, ended_at=None, exclude_pk=None) -> bool:
    start, end = session_window(scheduled_at, started_at, ended_at)
    horizon = timedelta(hours=8)
    candidates = TherapySession.objects.filter(
        professional=professional,
        deleted_at__isnull=True,
        scheduled_at__gte=start - horizon,
        scheduled_at__lte=end + horizon,
    ).exclude(status__in=["CANCELLED", "MISSED"])
    if exclude_pk is not None:
        candidates = candidates.exclude(pk=exclude_pk)
    for other in candidates:
        other_start, other_end = session_window(other.scheduled_at, other.started_at, other.ended_at)
        if start < other_end and other_start < end:
            return True
    return False


class TherapySessionSerializer(serializers.ModelSerializer):
    def get_fields(self):
        fields = super().get_fields()
        user = getattr(self.context.get("request"), "user", None)
        fields["patient"].queryset = accessible_patients(user, clinical=True, write=True)
        return fields

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
        started_at = attrs.get("started_at", getattr(self.instance, "started_at", None))
        ended_at = attrs.get("ended_at", getattr(self.instance, "ended_at", None))
        effective_start = started_at or scheduled_at
        if ended_at and effective_start and ended_at <= effective_start:
            raise serializers.ValidationError({"ended_at": "O término deve ser posterior ao início da sessão."})
        status = attrs.get("status", getattr(self.instance, "status", "SCHEDULED"))
        if scheduled_at and status not in {"CANCELLED", "MISSED"}:
            if has_overlapping_session(
                professional=self.context["request"].user,
                scheduled_at=scheduled_at,
                started_at=started_at,
                ended_at=ended_at,
                exclude_pk=self.instance.pk if self.instance else None,
            ):
                raise serializers.ValidationError({"scheduled_at": "Já existe um atendimento neste horário ou em intervalo sobreposto para este profissional."})
        return attrs
