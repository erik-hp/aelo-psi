from rest_framework import viewsets
from rest_framework.permissions import BasePermission
from .models import AuditLog
from .serializers import AuditLogSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_role)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminRole]
    queryset = AuditLog.objects.select_related("user").all()
    filterset_fields = ("action", "entity", "user")
