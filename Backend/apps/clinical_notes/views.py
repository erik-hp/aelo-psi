from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from apps.audit_logs.services import audit
from apps.patients.access import accessible_patients
from services.security.anonymization import anonymize_text
from .models import ClinicalNote, ClinicalNoteHistory
from .serializers import ClinicalNoteSerializer


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ClinicalNoteSerializer
    filterset_fields = ("patient", "session")

    def get_queryset(self):
        write = self.request.method not in ('GET', 'HEAD', 'OPTIONS')
        return ClinicalNote.objects.filter(deleted_at__isnull=True, patient__in=accessible_patients(self.request.user, clinical=True, write=write))

    def list(self, request, *args, **kwargs):
        result = super().list(request, *args, **kwargs)
        audit(request, 'LIST', self, {'module': 'clinical_notes', 'method': 'GET'})
        return result

    def retrieve(self, request, *args, **kwargs):
        note = self.get_object()
        audit(request, 'READ', note, {'module': 'clinical_notes', 'method': 'GET'})
        return Response(self.get_serializer(note).data)

    def perform_create(self, serializer):
        patient = serializer.validated_data["patient"]
        allowed = accessible_patients(self.request.user, clinical=True, write=True).filter(pk=patient.pk)
        if not allowed.exists():
            raise PermissionDenied("Patient is not accessible by this user.")
        note = serializer.save(author=self.request.user)
        audit(self.request, "CREATE", note, {"module": "clinical_notes"})

    def perform_update(self, serializer):
        note = self.get_object()
        if note.locked_at is not None:
            raise PermissionDenied('Nota assinada: utilize fluxo formal de retificação.')
        ClinicalNoteHistory.objects.create(
            note=note,
            edited_by=self.request.user,
            raw_text=note.raw_text,
            anonymized_text=note.anonymized_text,
            version=note.version,
        )
        updated = serializer.save(
            version=note.version + 1,
            anonymized_text=anonymize_text(
                serializer.validated_data.get("raw_text", note.raw_text),
                display_name=note.patient.display_name,
                internal_code=note.patient.internal_code,
            ),
        )
        audit(self.request, "UPDATE", updated, {"module": "clinical_notes", "version": updated.version})

    def perform_destroy(self, instance):
        if instance.locked_at is not None:
            raise PermissionDenied('Nota assinada não pode ser excluída.')
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "clinical_notes"})
