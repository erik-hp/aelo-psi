from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from apps.audit_logs.services import audit
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import Patient
from apps.users.models import UserRole
from .models import AIAnalysis, AnalysisStatus, HumanValidation
from .permissions import CanRequestAI, CanReviewAI
from .serializers import AIAnalysisSerializer, AnalysisRequestSerializer, ReviewSerializer
from .services import request_ai_analysis


class AIThrottle(UserRateThrottle):
    scope = "ai"


def accessible_patient_or_403(user, patient_id):
    qs = Patient.objects.filter(deleted_at__isnull=True)
    if not user.is_admin_role:
        qs = qs.filter(access_grants__user=user)
    patient = get_object_or_404(qs.distinct(), id=patient_id)
    return patient


@api_view(["POST"])
@permission_classes([CanRequestAI])
@throttle_classes([AIThrottle])
def request_analysis(request):
    serializer = AnalysisRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    patient = accessible_patient_or_403(request.user, serializer.validated_data["patient"])
    note = None
    if serializer.validated_data.get("note"):
        note = get_object_or_404(ClinicalNote, id=serializer.validated_data["note"], patient=patient, deleted_at__isnull=True)
    analysis = request_ai_analysis(
        patient=patient,
        note=note,
        user=request.user,
        context_limit=serializer.validated_data["context_limit"],
    )
    audit(request, "AI_REQUEST", analysis, {"patient": str(patient.id)})
    return Response(AIAnalysisSerializer(analysis).data, status=status.HTTP_201_CREATED)


class AIAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AIAnalysisSerializer
    filterset_fields = ("patient", "status")

    def get_queryset(self):
        qs = AIAnalysis.objects.select_related("patient", "requested_by", "note").prefetch_related("sources", "sentiment_metrics")
        if self.request.user.is_admin_role:
            return qs
        return qs.filter(patient__access_grants__user=self.request.user).distinct()

    @action(detail=True, methods=["post"], permission_classes=[CanReviewAI])
    def validate(self, request, pk=None):
        return self._review(request, AnalysisStatus.VALIDATED)

    @action(detail=True, methods=["post"], permission_classes=[CanReviewAI])
    def reject(self, request, pk=None):
        return self._review(request, AnalysisStatus.REJECTED)

    def _review(self, request, decision):
        analysis = self.get_object()
        if not (request.user.is_admin_role or request.user.role == UserRole.PSYCHOLOGIST):
            raise PermissionDenied("Only psychologists can review AI analyses.")
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        analysis.status = decision
        analysis.save(update_fields=["status", "updated_at"])
        HumanValidation.objects.update_or_create(
            analysis=analysis,
            defaults={
                "reviewed_by": request.user,
                "decision": decision,
                "comment": serializer.validated_data.get("comment", ""),
            },
        )
        audit(request, f"AI_{decision}", analysis, {"comment": serializer.validated_data.get("comment", "")})
        return Response(self.get_serializer(analysis).data)
