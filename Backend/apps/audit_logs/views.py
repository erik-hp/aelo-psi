from rest_framework import viewsets
from rest_framework.permissions import BasePermission
from .models import AuditLog
from .serializers import AuditLogSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_role and request.user.clinic_id)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminRole]
    def get_queryset(self):
        # Admin audits concern only users from the same clinic.
        return (
            AuditLog.objects.select_related('user')
            .filter(user__clinic_id=self.request.user.clinic_id)
            .order_by('-sequence')
        )
    filterset_fields = ("action", "entity", "user")
