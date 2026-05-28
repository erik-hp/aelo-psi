from django.conf import settings
from django.db import models
from services.security.models import TimestampedModel


class AuditLog(TimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs")
    action = models.CharField(max_length=64, db_index=True)
    entity = models.CharField(max_length=120, db_index=True)
    entity_id = models.CharField(max_length=64, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["entity", "entity_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.entity}:{self.entity_id}"
