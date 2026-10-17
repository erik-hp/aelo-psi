from rest_framework import viewsets
from apps.audit_logs.services import audit
from apps.patients.access import accessible_patients
from .models import TherapySession
from .serializers import TherapySessionSerializer


class TherapySessionViewSet(viewsets.ModelViewSet):
    serializer_class = TherapySessionSerializer
    filterset_fields = ("status", "patient")

    def get_queryset(self):
        write = self.request.method not in ('GET', 'HEAD', 'OPTIONS')
        allowed = accessible_patients(self.request.user, clinical=True, write=write)
        return TherapySession.objects.filter(deleted_at__isnull=True, patient__in=allowed)

    def perform_create(self, serializer):
        session = serializer.save(professional=self.request.user)
        audit(self.request, "CREATE", session, {"module": "therapy_sessions"})

    def perform_update(self, serializer):
        session = serializer.save()
        audit(self.request, "UPDATE", session, {"module": "therapy_sessions"})

    def perform_destroy(self, instance):
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "therapy_sessions"})
