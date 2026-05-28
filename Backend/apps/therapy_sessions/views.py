from rest_framework import viewsets
from apps.audit_logs.services import audit
from apps.patients.models import Patient
from .models import TherapySession
from .serializers import TherapySessionSerializer


class TherapySessionViewSet(viewsets.ModelViewSet):
    serializer_class = TherapySessionSerializer
    filterset_fields = ("status", "patient")

    def get_queryset(self):
        patient_ids = Patient.objects.filter(access_grants__user=self.request.user, deleted_at__isnull=True).values("id")
        qs = TherapySession.objects.filter(deleted_at__isnull=True)
        if self.request.user.is_admin_role:
            return qs
        return qs.filter(patient_id__in=patient_ids).distinct()

    def perform_create(self, serializer):
        session = serializer.save(professional=self.request.user)
        audit(self.request, "CREATE", session, {"module": "therapy_sessions"})

    def perform_update(self, serializer):
        session = serializer.save()
        audit(self.request, "UPDATE", session, {"module": "therapy_sessions"})

    def perform_destroy(self, instance):
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "therapy_sessions"})
