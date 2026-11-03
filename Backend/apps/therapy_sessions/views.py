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
        patient_ids = accessible_patients(self.request.user).values("id")
        return TherapySession.objects.filter(patient_id__in=patient_ids, deleted_at__isnull=True).order_by("-scheduled_at", "-id")

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
