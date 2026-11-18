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
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)
    user_display = serializers.SerializerMethodField()

    def get_user_display(self, obj) -> str:
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.username

    class Meta:
        model = PatientAccess
        fields = (
            "id",
            "patient",
            "user",
            "user_username",
            "user_role",
            "user_display",
            "can_edit",
            "granted_by",
            "created_at",
        )
        read_only_fields = ("id", "user_username", "user_role", "user_display", "granted_by", "created_at")
