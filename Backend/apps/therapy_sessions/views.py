from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from apps.audit_logs.mixins import AuditReadMixin
from apps.audit_logs.services import audit
from apps.patients.access import accessible_patients, can_edit_patient
from .models import TherapySession
from .serializers import TherapySessionSerializer


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

    def perform_create(self, serializer):
        session = serializer.save(professional=self.request.user)
        audit(self.request, "CREATE", session, {"module": "therapy_sessions"})

    def perform_update(self, serializer):
        if not can_edit_patient(self.request.user, serializer.instance.patient):
            raise PermissionDenied("Edit access to this patient is required.")
        session = serializer.save()
        audit(self.request, "UPDATE", session, {"module": "therapy_sessions"})

    def perform_destroy(self, instance):
        if not can_edit_patient(self.request.user, instance.patient):
            raise PermissionDenied("Edit access to this patient is required.")
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "therapy_sessions"})
