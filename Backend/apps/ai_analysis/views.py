import base64
import hashlib

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from apps.audit_logs.mixins import AuditReadMixin
from apps.audit_logs.services import audit
from apps.clinical_notes.models import ClinicalNote
from apps.patients.access import accessible_patients, can_edit_patient
from apps.users.models import UserRole, UserSigningKey
from .models import AIAnalysis, AnalysisStatus, HumanValidation, VaultCheckpoint, VaultEdge, VaultNode, VaultJob, AnalysisJob
from .permissions import CanRequestAI, CanReviewAI
from .serializers import AIAnalysisSerializer, AnalysisRequestSerializer, ReviewSerializer, SigningPayloadSerializer, VaultNodeSerializer, VaultEdgeSerializer, VaultCheckpointSummarySerializer, VaultCheckpointDetailSerializer
from .vault import detect_communities
from .signatures import signing_payload, verify_raw_signature, verify_validation


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
    if not can_edit_patient(request.user, patient):
        raise PermissionDenied("Edit access to this patient is required.")
    note = None
    if serializer.validated_data.get("note"):
        note = get_object_or_404(ClinicalNote, id=serializer.validated_data["note"], patient=patient, deleted_at__isnull=True)
    job = AnalysisJob.objects.create(patient=patient, note=note, requested_by=request.user, context_limit=serializer.validated_data["context_limit"])
    audit(request, "AI_REQUEST_QUEUED", job, {"patient": str(patient.id)})
    return Response({"job_id": str(job.id), "status": job.status}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
@permission_classes([CanRequestAI])
def read_analysis_job(request, job_id):
    job = get_object_or_404(AnalysisJob, pk=job_id, patient_id__in=accessible_patients(request.user, clinical=True).values("id"))
    audit(request, "AI_JOB_READ", job, {"patient": str(job.patient_id)})
    response = Response({"id": str(job.id), "status": job.status, "error_code": job.error_code if job.status == VaultJob.Status.FAILED else "", "analysis_id": str(job.result_id) if job.result_id else None})
    response["Cache-Control"] = "no-store"
    return response


@api_view(["GET"])
@permission_classes([CanRequestAI])
def patient_vault(request, patient_id):
    patient = accessible_patient_or_403(request.user, patient_id)
    nodes = list(VaultNode.objects.filter(patient=patient).order_by("first_seen_at", "id")[:200])
    node_ids = [node.id for node in nodes]
    edges = list(VaultEdge.objects.filter(patient=patient, source_id__in=node_ids, target_id__in=node_ids).order_by("observed_at", "id")[:400])
    communities = detect_communities(nodes, edges)
    checkpoints = VaultCheckpoint.objects.filter(patient=patient).select_related("analysis", "analysis__human_validation").order_by("-created_at")[:30]
    audit(request, "VAULT_READ", patient, {"nodes": len(nodes)})
    response = Response({
        "nodes": VaultNodeSerializer(nodes, many=True).data,
        "edges": VaultEdgeSerializer(edges, many=True).data,
        "communities": communities,
        "checkpoints": VaultCheckpointSummarySerializer(checkpoints, many=True).data,
    })
    response["Cache-Control"] = "no-store"
    return response


@api_view(["POST"])
@permission_classes([CanRequestAI])
@throttle_classes([AIThrottle])
def build_vault_checkpoint(request, analysis_id):
    analysis = get_object_or_404(AIAnalysis.objects.select_related("patient", "note"), pk=analysis_id, patient_id__in=accessible_patients(request.user, clinical=True).values("id"))
    if not can_edit_patient(request.user, analysis.patient):
        raise PermissionDenied("Edit access to this patient is required.")
    if analysis.status != AnalysisStatus.PENDING_REVIEW or analysis.note is None or analysis.note.deleted_at is not None:
        raise ValidationError("A pending analysis with a source note is required.")
    if VaultCheckpoint.objects.filter(analysis=analysis).exists():
        raise ValidationError("A checkpoint already exists for this analysis.")
    with transaction.atomic():
        job, created = VaultJob.objects.select_for_update().get_or_create(analysis=analysis)
        if not created and job.status == VaultJob.Status.FAILED and job.attempts < 3:
            job.status = VaultJob.Status.PENDING
            job.error_code = ""
            job.save(update_fields=["status", "error_code", "updated_at"])
    audit(request, "VAULT_CHECKPOINT_QUEUED", job, {"patient": str(analysis.patient_id), "analysis": str(analysis.id)})
    return Response({"job_id": str(job.id), "status": job.status}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
@permission_classes([CanRequestAI])
def read_vault_job(request, job_id):
    job = get_object_or_404(VaultJob.objects.select_related("analysis"), pk=job_id, analysis__patient_id__in=accessible_patients(request.user, clinical=True).values("id"))
    audit(request, "VAULT_JOB_READ", job, {"patient": str(job.analysis.patient_id)})
    response = Response({"id": str(job.id), "status": job.status, "error_code": job.error_code if job.status == VaultJob.Status.FAILED else "", "checkpoint_id": str(job.analysis.vault_checkpoint.id) if job.status == VaultJob.Status.COMPLETED and hasattr(job.analysis, "vault_checkpoint") else None})
    response["Cache-Control"] = "no-store"
    return response


@api_view(["GET"])
@permission_classes([CanRequestAI])
def read_vault_checkpoint(request, checkpoint_id):
    checkpoint = get_object_or_404(VaultCheckpoint.objects.select_related("analysis", "patient"), pk=checkpoint_id, patient_id__in=accessible_patients(request.user, clinical=True).values("id"))
    audit(request, "VAULT_CHECKPOINT_READ", checkpoint, {"patient": str(checkpoint.patient_id)})
    if request.query_params.get("download") == "1":
        if checkpoint.analysis.status != AnalysisStatus.VALIDATED:
            raise PermissionDenied("A signed clinical approval is required before export.")
        validation = getattr(checkpoint.analysis, "human_validation", None)
        try:
            signature_valid = validation is not None and verify_validation(validation)
        except ValueError:
            signature_valid = False
        if not signature_valid:
            raise PermissionDenied("The clinical approval signature could not be verified.")
        if hashlib.sha256(checkpoint.markdown.encode("utf-8")).hexdigest() != checkpoint.content_sha256:
            raise PermissionDenied("The checkpoint content hash does not match.")
        response = HttpResponse(checkpoint.markdown, content_type="text/markdown; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="aelo-checkpoint-{checkpoint.id}.md"'
    else:
        response = Response(VaultCheckpointDetailSerializer(checkpoint).data)
    response["Cache-Control"] = "no-store"
    response["X-Content-Type-Options"] = "nosniff"
    return response


class AIAnalysisViewSet(AuditReadMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = AIAnalysisSerializer
    audit_module = "ai_analysis"
    filterset_fields = ("patient", "status")

    def get_queryset(self):
        patient_ids = accessible_patients(self.request.user, clinical=True).values("id")
        return (
            AIAnalysis.objects.filter(patient_id__in=patient_ids)
            .order_by("-created_at", "-id")
            .select_related("patient", "requested_by", "note")
            .prefetch_related("sources", "sentiment_metrics")
        )

    @action(detail=True, methods=["post"], permission_classes=[CanReviewAI])
    def validate(self, request, pk=None):
        return self._review(request, AnalysisStatus.VALIDATED)

    @action(detail=True, methods=["post"], permission_classes=[CanReviewAI])
    def reject(self, request, pk=None):
        return self._review(request, AnalysisStatus.REJECTED)

    @action(detail=True, methods=["post"], permission_classes=[CanReviewAI], url_path="signing-payload")
    def signing_payload(self, request, pk=None):
        analysis = self.get_object()
        if not can_edit_patient(request.user, analysis.patient):
            raise PermissionDenied("Edit access to this patient is required.")
        if analysis.status != AnalysisStatus.PENDING_REVIEW:
            raise PermissionDenied("This analysis has already been reviewed.")
        serializer = SigningPayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = signing_payload(
            analysis,
            decision=serializer.validated_data["decision"],
            comment=serializer.validated_data.get("comment", ""),
            reviewer_id=request.user.pk,
        )
        audit(request, "AI_SIGNING_PAYLOAD", analysis, {"patient": str(analysis.patient_id)})
        response = Response({"payload": base64.b64encode(payload).decode("ascii")})
        response["Cache-Control"] = "no-store"
        return response

    @transaction.atomic
    def _review(self, request, decision):
        analysis = self.get_object()
        if request.user.role != UserRole.PSYCHOLOGIST or not accessible_patients(request.user, clinical=True, write=True).filter(pk=analysis.patient_id).exists():
            raise PermissionDenied("Only psychologists can review AI analyses.")
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        analysis = AIAnalysis.objects.select_for_update().get(pk=analysis.pk)
        if analysis.status != AnalysisStatus.PENDING_REVIEW:
            raise PermissionDenied("This analysis has already been reviewed.")
        key = UserSigningKey.objects.filter(user=request.user).first()
        if key is None:
            raise ValidationError("Register a signing key before reviewing AI analyses.")
        comment = serializer.validated_data.get("comment", "")
        payload = signing_payload(analysis, decision=decision, comment=comment, reviewer_id=request.user.pk)
        signature = serializer.validated_data["signature"]
        if not verify_raw_signature(key.public_key_spki, signature, payload):
            raise ValidationError("The review signature is invalid for this analysis and decision.")
        analysis.status = decision
        analysis.save(update_fields=["status", "updated_at"])
        HumanValidation.objects.create(
            analysis=analysis,
            reviewed_by=request.user,
            decision=decision,
            comment=comment,
            signature=signature,
            public_key_spki=key.public_key_spki,
            signed_payload_sha256=hashlib.sha256(payload).hexdigest(),
        )
        audit(request, f"AI_{decision}", analysis, {"module": "ai_analysis"})
        return Response(self.get_serializer(analysis).data)
