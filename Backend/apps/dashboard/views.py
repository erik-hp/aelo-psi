from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.ai_analysis.models import AIAnalysis
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import Patient
from apps.therapy_sessions.models import TherapySession


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def longitudinal_dashboard(request):
    patient_id = request.query_params.get("patient")
    patient_qs = Patient.objects.filter(deleted_at__isnull=True)
    if not request.user.is_admin_role:
        patient_qs = patient_qs.filter(access_grants__user=request.user)
    if patient_id:
        patient_qs = patient_qs.filter(id=patient_id)
    patient_ids = patient_qs.values("id")
    return Response(
        {
            "patients": patient_qs.count(),
            "sessions_by_status": list(
                TherapySession.objects.filter(patient_id__in=patient_ids, deleted_at__isnull=True)
                .values("status")
                .annotate(total=Count("id"))
                .order_by("status")
            ),
            "notes": ClinicalNote.objects.filter(patient_id__in=patient_ids, deleted_at__isnull=True).count(),
            "ai_analyses_by_status": list(
                AIAnalysis.objects.filter(patient_id__in=patient_ids)
                .values("status")
                .annotate(total=Count("id"))
                .order_by("status")
            ),
        }
    )
