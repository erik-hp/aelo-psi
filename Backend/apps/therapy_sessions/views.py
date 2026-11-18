from rest_framework import viewsets
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.audit_logs.mixins import AuditReadMixin
from apps.audit_logs.services import audit
from apps.patients.access import accessible_patients, can_edit_patient
from .models import TherapySession
from .serializers import TherapySessionSerializer, has_overlapping_session


class TherapySessionViewSet(AuditReadMixin, viewsets.ModelViewSet):
    serializer_class = TherapySessionSerializer
    audit_module = "therapy_sessions"
    filterset_fields = ("status", "patient")

    def get_queryset(self):
        write = self.request.method not in ('GET', 'HEAD', 'OPTIONS')
        allowed = accessible_patients(self.request.user, clinical=True, write=write)
        qs = TherapySession.objects.filter(deleted_at__isnull=True, patient__in=allowed)
        # Shared patient grants authorize reading prior sessions, not editing
        # another psychologist's session or changing their schedule/summary.
        if write:
            qs = qs.filter(professional=self.request.user)
        return qs.order_by("-scheduled_at", "-id")

    def save_slot(self, serializer, **kwargs):
        try:
            with transaction.atomic():
                get_user_model().objects.select_for_update().get(pk=self.request.user.pk)
                instance = serializer.instance
                scheduled_at = serializer.validated_data.get("scheduled_at", getattr(instance, "scheduled_at", None))
                started_at = serializer.validated_data.get("started_at", getattr(instance, "started_at", None))
                ended_at = serializer.validated_data.get("ended_at", getattr(instance, "ended_at", None))
                status_val = serializer.validated_data.get("status", getattr(instance, "status", "SCHEDULED"))
                if scheduled_at and status_val not in {"CANCELLED", "MISSED"} and has_overlapping_session(
                    professional=self.request.user,
                    scheduled_at=scheduled_at,
                    started_at=started_at,
                    ended_at=ended_at,
                    exclude_pk=instance.pk if instance else None,
                ):
                    raise ValidationError({"scheduled_at": "Já existe um atendimento neste horário ou em intervalo sobreposto para este profissional."})
                return serializer.save(**kwargs)
        except IntegrityError as exc:
            raise ValidationError({"scheduled_at": "Já existe um atendimento neste horário para este profissional."}) from exc

    def perform_create(self, serializer):
        session = self.save_slot(serializer, professional=self.request.user)
        audit(self.request, "CREATE", session, {"module": "therapy_sessions"})

    def perform_update(self, serializer):
        if not can_edit_patient(self.request.user, serializer.instance.patient):
            raise PermissionDenied("Edit access to this patient is required.")
        session = self.save_slot(serializer)
        audit(self.request, "UPDATE", session, {"module": "therapy_sessions"})

    def perform_destroy(self, instance):
        if not can_edit_patient(self.request.user, instance.patient):
            raise PermissionDenied("Edit access to this patient is required.")
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "therapy_sessions"})
