from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.http import JsonResponse
from apps.audit_logs.mixins import AuditReadMixin
from apps.audit_logs.services import audit
from .access import accessible_patients
from .fhir import patient_bundle
from .models import PatientAccess, PatientStatus
from .permissions import PatientObjectPermission
from .serializers import PatientSerializer


class PatientViewSet(AuditReadMixin, viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    audit_module = "patients"
    permission_classes = [PatientObjectPermission]
    filterset_fields = ("status",)
    search_fields = ("internal_code", "display_name")

    def get_queryset(self):
        return accessible_patients(self.request.user)

    def perform_create(self, serializer):
        if self.request.user.clinic_id is None:
            raise PermissionDenied("A clinic is required to create a patient.")
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

    @action(detail=True, methods=["get"])
    def fhir(self, request, pk=None):
        patient = self.get_object()
        bundle = patient_bundle(patient)
        audit(request, "FHIR_EXPORT", patient, {"module": "patients", "resource_count": len(bundle["entry"])})
        response = JsonResponse(bundle, content_type="application/fhir+json")
        response["Cache-Control"] = "no-store"
        return response
