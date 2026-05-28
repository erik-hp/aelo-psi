from rest_framework import serializers
from apps.patients.models import Patient
from apps.patients.permissions import PatientObjectPermission
from .models import TherapySession


class TherapySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TherapySession
        fields = (
            "id",
            "patient",
            "professional",
            "scheduled_at",
            "started_at",
            "ended_at",
            "status",
            "summary",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "professional", "created_at", "updated_at")

    def validate_patient(self, patient: Patient):
        request = self.context["request"]
        permission = PatientObjectPermission()
        if not permission.has_object_permission(request, self.context.get("view"), patient):
            raise serializers.ValidationError("Patient is not accessible by this user.")
        return patient
