import base64
import hashlib
from datetime import timedelta
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from apps.ai_analysis.retrieval import queue_note_extraction
from apps.ai_analysis.signatures import verify_raw_signature
from apps.audit_logs.mixins import AuditReadMixin
from apps.audit_logs.services import audit
from apps.patients.access import accessible_patients, can_edit_patient
from apps.users.models import UserRole, UserSigningKey
from services.security.anonymization import UnsafeClinicalText, anonymize_text, prepare_ai_text
from .models import ClinicalNote, ClinicalNoteDraft, ClinicalNoteHistory, NoteStatus
from .serializers import (
    ClinicalNoteHistorySerializer,
    ClinicalNoteSerializer,
    NoteAmendSerializer,
    NoteSignSerializer,
    NoteSigningPayloadSerializer,
)
from .signatures import note_signing_payload


class NoteVersionConflict(APIException):
    status_code = 409
    default_detail = "A nota foi alterada. Recarregue antes de salvar novamente."
    default_code = "NOTE_VERSION_CONFLICT"


class ClinicalNoteViewSet(AuditReadMixin, viewsets.ModelViewSet):
    serializer_class = ClinicalNoteSerializer
    audit_module = "clinical_notes"
    filterset_fields = ("patient", "session")

    def get_queryset(self):
        write = self.request.method not in ('GET', 'HEAD', 'OPTIONS')
        qs = ClinicalNote.objects.filter(
            deleted_at__isnull=True,
            patient__in=accessible_patients(self.request.user, clinical=True, write=write),
        )
        # A grant permits reading other professionals' records, but it does
        # not permit modifying their authored narrative or deleting it.
        if write:
            qs = qs.filter(author=self.request.user)
        return qs.order_by("-created_at", "-id")

    @transaction.atomic
    def perform_create(self, serializer):
        patient = serializer.validated_data["patient"]
        allowed = accessible_patients(self.request.user, clinical=True, write=True).filter(pk=patient.pk)
        if not allowed.exists():
            raise PermissionDenied("Patient is not accessible by this user.")
        note = serializer.save(author=self.request.user)
        queue_note_extraction(note)
        audit(self.request, "CREATE", note, {"module": "clinical_notes"})

    @transaction.atomic
    def perform_update(self, serializer):
        # Protect version and history writes against concurrent editors.
        note = self.get_queryset().select_for_update().get(pk=serializer.instance.pk)
        expected_version = serializer.validated_data.pop("expected_version", None)
        if expected_version is not None and expected_version != note.version:
            raise NoteVersionConflict()
        if note.locked_at is not None or note.status in {NoteStatus.SIGNED, NoteStatus.AMENDED}:
            raise PermissionDenied('Nota assinada: utilize fluxo formal de retificação.')
        ClinicalNoteHistory.objects.create(
            note=note,
            edited_by=self.request.user,
            raw_text=note.raw_text,
            anonymized_text=note.anonymized_text,
            version=note.version,
            status_at_archive=note.status,
        )
        serializer.instance = note
        updated = serializer.save(
            version=note.version + 1,
            anonymized_text=anonymize_text(
                serializer.validated_data.get("raw_text", note.raw_text),
                display_name=note.patient.display_name,
                internal_code=note.patient.internal_code,
            ),
        )
        queue_note_extraction(updated)
        audit(self.request, "UPDATE", updated, {"module": "clinical_notes", "version": updated.version})

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.locked_at is not None or instance.status in {NoteStatus.SIGNED, NoteStatus.AMENDED}:
            raise PermissionDenied('Nota assinada não pode ser excluída.')
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "clinical_notes"})

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        note = self.get_object()
        entries = note.history.order_by("-version", "-id")
        audit(request, "READ", note, {"module": "clinical_notes", "method": "GET", "version": note.version})
        response = Response(ClinicalNoteHistorySerializer(entries, many=True).data)
        response["Cache-Control"] = "no-store"
        return response

    @action(detail=True, methods=["post"], url_path="submit-review")
    @transaction.atomic
    def submit_review(self, request, pk=None):
        note = self.get_object()
        if request.user.role != UserRole.PSYCHOLOGIST:
            raise PermissionDenied("Somente psicólogo responsável pode submeter a nota à revisão.")
        note = ClinicalNote.objects.select_for_update().get(pk=note.pk)
        if note.locked_at is not None or note.status in {NoteStatus.SIGNED, NoteStatus.AMENDED}:
            raise PermissionDenied("A nota já está assinada.")
        if note.status != NoteStatus.IN_REVIEW:
            note.status = NoteStatus.IN_REVIEW
            note.save(update_fields=["status", "updated_at"])
        audit(request, "NOTE_SUBMIT_REVIEW", note, {"module": "clinical_notes", "version": note.version})
        return Response(self.get_serializer(note).data)

    @action(detail=True, methods=["post"], url_path="signing-payload")
    def signing_payload(self, request, pk=None):
        note = self.get_object()
        if request.user.role != UserRole.PSYCHOLOGIST:
            raise PermissionDenied("Somente psicólogo responsável pode assinar ou retificar notas clínicas.")
        serializer = NoteSigningPayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action_type = serializer.validated_data["action"]
        is_locked = note.locked_at is not None or note.status in {NoteStatus.SIGNED, NoteStatus.AMENDED}
        if action_type == "SIGN":
            if is_locked:
                raise PermissionDenied("Esta nota já está assinada.")
            payload = note_signing_payload(
                note,
                action="SIGN",
                raw_text=note.raw_text,
                version=note.version,
                signer_id=request.user.pk,
            )
        else:
            if not is_locked:
                raise PermissionDenied("Somente notas assinadas utilizam o fluxo de retificação.")
            raw_text = (serializer.validated_data.get("raw_text") or "").strip()
            reason = (serializer.validated_data.get("reason") or "").strip()
            if not raw_text or len(reason) < 10:
                raise ValidationError("Informe o texto retificado e o motivo formal (mínimo de 10 caracteres).")
            payload = note_signing_payload(
                note,
                action="AMEND",
                raw_text=serializer.validated_data["raw_text"],
                version=note.version + 1,
                signer_id=request.user.pk,
                reason=reason,
            )
        audit(request, "NOTE_SIGNING_PAYLOAD", note, {"module": "clinical_notes", "version": note.version})
        response = Response({"payload": base64.b64encode(payload).decode("ascii")})
        response["Cache-Control"] = "no-store"
        return response

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def sign(self, request, pk=None):
        note = self.get_object()
        if request.user.role != UserRole.PSYCHOLOGIST:
            raise PermissionDenied("Somente psicólogo responsável pode assinar notas clínicas.")
        serializer = NoteSignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = ClinicalNote.objects.select_related("patient").select_for_update().get(pk=note.pk)
        if note.locked_at is not None or note.status in {NoteStatus.SIGNED, NoteStatus.AMENDED}:
            raise PermissionDenied("Esta nota já está assinada.")
        key = UserSigningKey.objects.filter(user=request.user).first()
        if key is None:
            raise ValidationError("Registre uma chave de assinatura antes de assinar a nota clínica.")
        payload = note_signing_payload(
            note,
            action="SIGN",
            raw_text=note.raw_text,
            version=note.version,
            signer_id=request.user.pk,
        )
        signature = serializer.validated_data["signature"]
        if not verify_raw_signature(key.public_key_spki, signature, payload):
            raise ValidationError("Assinatura criptográfica inválida para esta nota e versão.")
        now = timezone.now()
        note.status = NoteStatus.SIGNED
        note.locked_at = now
        note.signed_by = request.user
        note.signed_at = now
        note.signature = signature
        note.public_key_spki = key.public_key_spki
        note.signed_payload_sha256 = hashlib.sha256(payload).hexdigest()
        note.save(update_fields=[
            "status", "locked_at", "signed_by", "signed_at",
            "signature", "public_key_spki", "signed_payload_sha256", "updated_at",
        ])
        audit(request, "NOTE_SIGNED", note, {"module": "clinical_notes", "version": note.version})
        return Response(self.get_serializer(note).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def amend(self, request, pk=None):
        note = self.get_object()
        if request.user.role != UserRole.PSYCHOLOGIST:
            raise PermissionDenied("Somente psicólogo responsável pode retificar notas assinadas.")
        serializer = NoteAmendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = ClinicalNote.objects.select_related("patient").select_for_update().get(pk=note.pk)
        if note.locked_at is None and note.status not in {NoteStatus.SIGNED, NoteStatus.AMENDED}:
            raise PermissionDenied("Apenas notas assinadas podem ser retificadas por este fluxo.")
        new_text = serializer.validated_data["raw_text"]
        reason = serializer.validated_data["reason"].strip()
        if len(reason) < 10:
            raise ValidationError({"reason": "Informe o motivo formal da retificação com pelo menos 10 caracteres."})
        if new_text == note.raw_text:
            raise ValidationError({"raw_text": "O texto retificado deve conter alteração em relação à versão assinada."})
        key = UserSigningKey.objects.filter(user=request.user).first()
        if key is None:
            raise ValidationError("Registre uma chave de assinatura antes de retificar a nota clínica.")
        next_version = note.version + 1
        payload = note_signing_payload(
            note,
            action="AMEND",
            raw_text=new_text,
            version=next_version,
            signer_id=request.user.pk,
            reason=reason,
        )
        signature = serializer.validated_data["signature"]
        if not verify_raw_signature(key.public_key_spki, signature, payload):
            raise ValidationError("Assinatura criptográfica inválida para esta retificação.")
        ClinicalNoteHistory.objects.create(
            note=note,
            edited_by=request.user,
            raw_text=note.raw_text,
            anonymized_text=note.anonymized_text,
            version=note.version,
            status_at_archive=note.status,
            amendment_reason=reason,
        )
        now = timezone.now()
        note.raw_text = new_text
        note.anonymized_text = anonymize_text(
            new_text,
            display_name=note.patient.display_name,
            internal_code=note.patient.internal_code,
        )
        note.version = next_version
        note.status = NoteStatus.AMENDED
        note.locked_at = now
        note.signed_by = request.user
        note.signed_at = now
        note.signature = signature
        note.public_key_spki = key.public_key_spki
        note.signed_payload_sha256 = hashlib.sha256(payload).hexdigest()
        note.save(update_fields=[
            "raw_text", "anonymized_text", "version", "status", "locked_at",
            "signed_by", "signed_at", "signature", "public_key_spki", "signed_payload_sha256", "updated_at",
        ])
        queue_note_extraction(note)
        audit(request, "NOTE_AMENDED", note, {"module": "clinical_notes", "version": note.version})
        return Response(self.get_serializer(note).data)


@api_view(["GET", "PUT", "DELETE"])
def clinical_draft(request, patient_id):
    patient = get_object_or_404(accessible_patients(request.user, clinical=True, write=True), pk=patient_id)
    if not can_edit_patient(request.user, patient):
        raise PermissionDenied("Edit access to this patient is required.")
    if request.method == "GET":
        draft = ClinicalNoteDraft.objects.filter(patient=patient, user=request.user, expires_at__gt=timezone.now()).first()
        if draft is None:
            return Response(status=404)
        return Response({"title": draft.title, "content": draft.content, "version": draft.version, "updated_at": draft.updated_at})
    if request.method == "DELETE":
        ClinicalNoteDraft.objects.filter(patient=patient, user=request.user).delete()
        return Response(status=204)
    title = request.data.get("title")
    content = request.data.get("content")
    version = request.data.get("version")
    if not isinstance(title, str) or len(title) > 200 or not isinstance(content, str) or len(content) > 50000 or type(version) is not int or version < 0:
        raise ValidationError("Invalid clinical draft payload.")
    try:
        with transaction.atomic():
            draft = ClinicalNoteDraft.objects.select_for_update().filter(patient=patient, user=request.user).first()
            if draft is None:
                if version != 0:
                    return Response({"code": "DRAFT_CONFLICT"}, status=409)
                draft = ClinicalNoteDraft(patient=patient, user=request.user, version=1)
            else:
                if draft.expires_at <= timezone.now():
                    draft.version = 0
                if draft.version != version:
                    return Response({"code": "DRAFT_CONFLICT"}, status=409)
                draft.version += 1
            draft.title = title
            draft.content = content
            draft.expires_at = timezone.now() + timedelta(days=30)
            draft.save()
    except IntegrityError:
        return Response({"code": "DRAFT_CONFLICT"}, status=409)
    return Response({"version": draft.version, "updated_at": draft.updated_at}, status=200)


@api_view(["POST"])
def preview_ai_text(request):
    patient = get_object_or_404(accessible_patients(request.user, clinical=True, write=True), pk=request.data.get("patient"))
    if not can_edit_patient(request.user, patient):
        raise PermissionDenied("Edit access to this patient is required.")
    text = request.data.get("text")
    if not isinstance(text, str) or len(text) > 50000:
        raise ValidationError("Invalid clinical text.")
    try:
        prepared = prepare_ai_text(text, patient.display_name, patient.internal_code)
    except UnsafeClinicalText:
        return Response({"code": "UNSAFE_CLINICAL_TEXT"}, status=422)
    return Response({"prepared_text": prepared})
