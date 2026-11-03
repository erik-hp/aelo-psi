from datetime import timedelta
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.audit_logs.mixins import AuditReadMixin
from apps.audit_logs.services import audit
from apps.patients.access import accessible_patients, can_edit_patient
from services.security.anonymization import UnsafeClinicalText, anonymize_text, prepare_ai_text
from .models import ClinicalNote, ClinicalNoteDraft, ClinicalNoteHistory
from .serializers import ClinicalNoteSerializer


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
        return qs

    def list(self, request, *args, **kwargs):
        result = super().list(request, *args, **kwargs)
        audit(request, 'LIST', self, {'module': 'clinical_notes', 'method': 'GET'})
        return result

    def retrieve(self, request, *args, **kwargs):
        note = self.get_object()
        audit(request, 'READ', note, {'module': 'clinical_notes', 'method': 'GET'})
        return Response(self.get_serializer(note).data)

    @transaction.atomic
    def perform_create(self, serializer):
        patient = serializer.validated_data["patient"]
        allowed = accessible_patients(self.request.user, clinical=True, write=True).filter(pk=patient.pk)
        if not allowed.exists():
            raise PermissionDenied("Patient is not accessible by this user.")
        note = serializer.save(author=self.request.user)
        audit(self.request, "CREATE", note, {"module": "clinical_notes"})

    @transaction.atomic
    def perform_update(self, serializer):
        # Protect version and history writes against concurrent editors.
        note = self.get_queryset().select_for_update().get(pk=serializer.instance.pk)
        if note.locked_at is not None:
            raise PermissionDenied('Nota assinada: utilize fluxo formal de retificação.')
        ClinicalNoteHistory.objects.create(
            note=note,
            edited_by=self.request.user,
            raw_text=note.raw_text,
            anonymized_text=note.anonymized_text,
            version=note.version,
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
        audit(self.request, "UPDATE", updated, {"module": "clinical_notes", "version": updated.version})

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.locked_at is not None:
            raise PermissionDenied('Nota assinada não pode ser excluída.')
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "clinical_notes"})


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
