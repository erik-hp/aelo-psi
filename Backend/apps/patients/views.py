from rest_framework import viewsets, status
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django.http import JsonResponse
from apps.audit_logs.mixins import AuditReadMixin
from apps.audit_logs.services import audit
from .access import accessible_patients, can_access_patient
from .fhir import patient_bundle
from .models import PatientAccess, PatientStatus
from .serializers import PatientAccessSerializer
from apps.users.models import UserRole
from .permissions import PatientObjectPermission
from .serializers import PatientSerializer


class PatientViewSet(AuditReadMixin, viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    audit_module = "patients"
    permission_classes = [PatientObjectPermission]
    filterset_fields = ("status",)
    search_fields = ("internal_code", "display_name")

    def get_queryset(self):
        return accessible_patients(self.request.user, write=self.request.method not in ('GET', 'HEAD', 'OPTIONS'))

    def perform_create(self, serializer):
        if not self.request.user.clinic_id or not self.request.user.clinic.is_active or self.request.user.clinic.deleted_at is not None:
            raise PermissionDenied('A clínica ativa é obrigatória.')
        if not (self.request.user.is_admin_role or self.request.user.role == UserRole.PSYCHOLOGIST):
            raise PermissionDenied('Somente administração ou psicólogos podem cadastrar pacientes.')
        patient = serializer.save(clinic=self.request.user.clinic, created_by=self.request.user)
        if self.request.user.role == UserRole.PSYCHOLOGIST:
            PatientAccess.objects.get_or_create(
                patient=patient,
                user=self.request.user,
                defaults={"can_edit": True, "granted_by": self.request.user},
            )
        audit(self.request, "CREATE", patient, {"module": "patients"})

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        requested_status = serializer.validated_data.get("status", previous_status)
        if requested_status != previous_status and not self.request.user.is_admin_role:
            raise PermissionDenied("Only clinic administrators may change patient status.")
        patient = serializer.save()
        audit(self.request, "UPDATE", patient, {"module": "patients"})

    def perform_destroy(self, instance):
        # Patient documents are longitudinal records. Even a soft-delete can
        # conceal sessions, notes and required retention from clinical queries.
        # A supervised retention/deletion policy has not yet been approved.
        raise PermissionDenied("Patient deletion is disabled; use archive instead.")

    @action(detail=True, methods=["get"], url_path="access-grants")
    def access_grants(self, request, pk=None):
        patient = self.get_object()
        grants = PatientAccess.objects.filter(patient=patient).select_related("user").order_by("created_at")
        return Response(PatientAccessSerializer(grants, many=True).data)

    @action(detail=True, methods=["post"], url_path="grant-access")
    @transaction.atomic
    def grant_access(self, request, pk=None):
        patient = self.get_object()
        # Lock the patient to serialize simultaneous grant and revoke requests.
        patient = type(patient).objects.select_for_update().get(pk=patient.pk)
        if not (request.user.is_admin_role or can_access_patient(request.user, patient, clinical=True, write=True)):
            raise PermissionDenied("Only an authorized professional can delegate access.")
        beneficiary = get_object_or_404(
            get_user_model().objects.filter(
                clinic_id=patient.clinic_id, clinic__is_active=True, is_active=True,
                role__in=[UserRole.PSYCHOLOGIST, UserRole.INTERN],
            ), pk=request.data.get("user")
        )
        can_edit = request.data.get("can_edit", False)
        if type(can_edit) is not bool:
            raise ValidationError({"can_edit": "Expected boolean."})
        if beneficiary.role == UserRole.INTERN and can_edit:
            raise ValidationError({"can_edit": "Intern clinical editing requires an approved supervision workflow."})
        if request.user.is_admin_role and (beneficiary.role != UserRole.PSYCHOLOGIST or not can_edit):
            raise PermissionDenied("An administrator may only assign an initial psychologist.")
        grant = PatientAccess(
            patient=patient, user=beneficiary, granted_by=request.user, can_edit=can_edit,
        )
        try:
            grant.save()
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError
            from django.db import IntegrityError
            if isinstance(exc, (DjangoValidationError, IntegrityError)):
                raise ValidationError({"access": "Grant denied or already present."}) from exc
            raise
        audit(request, "ACCESS_GRANT", patient, {"module": "patients"})
        return Response(PatientAccessSerializer(grant).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="revoke-access")
    @transaction.atomic
    def revoke_access(self, request, pk=None):
        patient = self.get_object()
        patient = type(patient).objects.select_for_update().get(pk=patient.pk)
        if request.user.role != UserRole.PSYCHOLOGIST or not can_access_patient(
            request.user, patient, clinical=True, write=True
        ):
            raise PermissionDenied("Only an authorized psychologist may revoke a grant.")
        target = get_object_or_404(
            PatientAccess.objects.select_for_update().filter(patient=patient),
            user_id=request.data.get("user"),
        )
        if target.can_edit and target.user.role == UserRole.PSYCHOLOGIST:
            responsible = PatientAccess.objects.filter(
                patient=patient, can_edit=True, user__role=UserRole.PSYCHOLOGIST,
                user__is_active=True,
            ).exclude(pk=target.pk)
            if not responsible.exists():
                raise ValidationError({"access": "At least one responsible psychologist must remain."})
        target.delete()
        audit(request, "ACCESS_REVOKE", patient, {"module": "patients"})
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        if not request.user.is_admin_role:
            raise PermissionDenied("Only clinic administrators may archive patients.")
        patient = self.get_object()
        patient.status = PatientStatus.ARCHIVED
        patient.save(update_fields=["status", "updated_at"])
        audit(request, "ARCHIVE", patient, {"module": "patients"})
        return Response(self.get_serializer(patient).data)

    @action(detail=True, methods=["get"])
    def fhir(self, request, pk=None):
        patient = self.get_object()
        if not can_access_patient(request.user, patient, clinical=True):
            raise PermissionDenied("Clinical access is required for FHIR export.")
        bundle = patient_bundle(patient)
        audit(request, "FHIR_EXPORT", patient, {"module": "patients", "resource_count": len(bundle["entry"])})
        response = JsonResponse(bundle, content_type="application/fhir+json")
        response["Cache-Control"] = "no-store"
        return response
