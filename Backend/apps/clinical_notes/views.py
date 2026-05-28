from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from apps.audit_logs.services import audit
from apps.patients.models import Patient
from services.security.anonymization import anonymize_text
from .models import ClinicalNote, ClinicalNoteHistory
from .serializers import ClinicalNoteSerializer


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ClinicalNoteSerializer
    filterset_fields = ("patient", "session")

    def get_queryset(self):
        qs = ClinicalNote.objects.filter(deleted_at__isnull=True)
        if self.request.user.is_admin_role:
            return qs
        patient_ids = Patient.objects.filter(access_grants__user=self.request.user, deleted_at__isnull=True).values("id")
        return qs.filter(patient_id__in=patient_ids).distinct()

    def perform_create(self, serializer):
        patient = serializer.validated_data["patient"]
        allowed = Patient.objects.filter(id=patient.id, deleted_at__isnull=True)
        if not self.request.user.is_admin_role:
            allowed = allowed.filter(access_grants__user=self.request.user)
        if not allowed.exists():
            raise PermissionDenied("Patient is not accessible by this user.")
        note = serializer.save(author=self.request.user)
        audit(self.request, "CREATE", note, {"module": "clinical_notes"})

    def perform_update(self, serializer):
        note = self.get_object()
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
        instance.soft_delete()
        audit(self.request, "SOFT_DELETE", instance, {"module": "clinical_notes"})
