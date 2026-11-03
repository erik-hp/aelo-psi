"""Audit access to sensitive API collections and records."""

from rest_framework.response import Response

from .services import audit


class AuditReadMixin:
    audit_module = "clinical"

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        audit(request, "LIST", self, {"module": self.audit_module})
        return response

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        response = Response(serializer.data)
        audit(request, "READ", instance, {"module": self.audit_module})
        return response
