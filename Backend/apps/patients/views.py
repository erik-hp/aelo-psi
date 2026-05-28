from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.audit_logs.services import audit
from apps.users.models import UserRole
from .models import Patient, PatientAccess, PatientStatus
from .permissions import PatientObjectPermission
from .serializers import PatientSerializer


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [PatientObjectPermission]
    filterset_fields = ("status",)
    search_fields = ("internal_code", "display_name")

    def get_queryset(self):
        user = self.request.user
        qs = Patient.objects.filter(deleted_at__isnull=True)
        if user.is_admin_role:
            return qs
        direct = Q(created_by=user) if user.role == UserRole.PSYCHOLOGIST else Q()
        granted = Q(access_grants__user=user)
        return qs.filter(Q(clinic=user.clinic) & (direct | granted)).distinct()

    def perform_create(self, serializer):
        patient = serializer.save(clinic=self.request.user.clinic, created_by=self.request.user)
        PatientAccess.objects.get_or_create(
            patient=patient,
            user=self.request.user,
            defaults={"can_edit": True, "granted_by": self.request.user},
        )
        audit(self.request, "CREATE", patient, {"module": "patients"})

    def perform_update(self, serializer):
        patient = serializer.save()
        audit(self.request, "UPDATE", patient, {"module": "patients"})

    def perform_destroy(self, instance):
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "patients"})

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        patient = self.get_object()
        patient.status = PatientStatus.ARCHIVED
        patient.save(update_fields=["status", "updated_at"])
        audit(request, "ARCHIVE", patient, {"module": "patients"})
        return Response(self.get_serializer(patient).data)
