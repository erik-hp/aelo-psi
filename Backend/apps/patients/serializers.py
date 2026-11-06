from rest_framework import serializers
from .models import Patient, PatientAccess


class PatientSerializer(serializers.ModelSerializer):
    def validate_internal_code(self, value):
        value = value.strip()
        query = Patient.objects.filter(clinic_id=self.context["request"].user.clinic_id, internal_code=value)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        if query.exists():
            raise serializers.ValidationError("Este código já está em uso na clínica.")
        return value

    class Meta:
        model = Patient
        fields = ("id", "internal_code", "display_name", "status", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class PatientAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAccess
        fields = ("id", "patient", "user", "can_edit", "granted_by", "created_at")
        read_only_fields = ("id", "granted_by", "created_at")
