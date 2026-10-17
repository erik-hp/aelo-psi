from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied, APIException
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from apps.audit_logs.services import audit
from apps.clinical_notes.models import ClinicalNote
from apps.patients.access import accessible_patients
from apps.users.models import UserRole
from .models import AIAnalysis, AnalysisStatus, HumanValidation
from .permissions import CanRequestAI, CanReviewAI
from .serializers import AIAnalysisSerializer, AnalysisRequestSerializer, ReviewSerializer
from .services import request_ai_analysis
from services.ai.client import AIServiceError


class AIUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Análise assistiva indisponível. Nenhum resultado clínico foi gerado.'
    default_code = 'ai_unavailable'


class AIThrottle(UserRateThrottle):
    scope = "ai"


def accessible_patient_or_403(user, patient_id):
    qs = accessible_patients(user, clinical=True)
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
    try:
        analysis = request_ai_analysis(
            patient=patient,
            note=note,
            user=request.user,
            context_limit=serializer.validated_data["context_limit"],
        )
    except AIServiceError:
        raise AIUnavailable() from None
    audit(request, "AI_REQUEST", analysis, {"patient": str(patient.id)})
    return Response(AIAnalysisSerializer(analysis).data, status=status.HTTP_201_CREATED)


class AIAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    def list(self, request, *args, **kwargs):
        result = super().list(request, *args, **kwargs)
        audit(request, 'LIST', self, {'module': 'ai_analysis', 'method': 'GET'})
        return result

    serializer_class = AIAnalysisSerializer
    filterset_fields = ("patient", "status")

    def get_queryset(self):
        qs = AIAnalysis.objects.select_related("patient", "requested_by", "note").prefetch_related("sources", "sentiment_metrics")
        return qs.filter(patient__in=accessible_patients(self.request.user, clinical=True)).distinct()

    def retrieve(self, request, *args, **kwargs):
        analysis = self.get_object()
        audit(request, 'READ', analysis, {'module': 'ai_analysis', 'method': 'GET'})
        return Response(self.get_serializer(analysis).data)

    @action(detail=True, methods=["post"], permission_classes=[CanReviewAI])
    def validate(self, request, pk=None):
        return self._review(request, AnalysisStatus.VALIDATED)

    @action(detail=True, methods=["post"], permission_classes=[CanReviewAI])
    def reject(self, request, pk=None):
        return self._review(request, AnalysisStatus.REJECTED)

    def _review(self, request, decision):
        analysis = self.get_object()
        if request.user.role != UserRole.PSYCHOLOGIST or not accessible_patients(request.user, clinical=True, write=True).filter(pk=analysis.patient_id).exists():
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
        audit(request, f"AI_{decision}", analysis, {"module": "ai_analysis"})
        return Response(self.get_serializer(analysis).data)
