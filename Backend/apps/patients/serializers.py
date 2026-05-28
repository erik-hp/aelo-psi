from rest_framework import serializers
from .models import Patient, PatientAccess


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ("id", "internal_code", "display_name", "status", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class PatientAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAccess
        fields = ("id", "patient", "user", "can_edit", "granted_by", "created_at")
        read_only_fields = ("id", "granted_by", "created_at")
