from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from apps.audit_logs.services import audit
from .models import PatientAccess, PatientStatus
from .access import accessible_patients
from .permissions import PatientObjectPermission
from .serializers import PatientSerializer


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [PatientObjectPermission]
    filterset_fields = ("status",)
    search_fields = ("internal_code", "display_name")

    def get_queryset(self):
        return accessible_patients(self.request.user, write=self.request.method not in ('GET', 'HEAD', 'OPTIONS'))

    def perform_create(self, serializer):
        if not self.request.user.clinic_id or self.request.user.is_admin_role and not self.request.user.is_active:
            raise PermissionDenied('A clínica ativa é obrigatória.')
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
