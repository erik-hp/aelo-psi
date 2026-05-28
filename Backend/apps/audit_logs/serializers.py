from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ("id", "user", "action", "entity", "entity_id", "ip_address", "user_agent", "metadata", "created_at")
        read_only_fields = fields
