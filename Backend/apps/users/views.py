from rest_framework import viewsets
from rest_framework.permissions import BasePermission
from apps.audit_logs.services import audit
from .models import User
from .serializers import UserSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_role)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("clinic").all().order_by("username")
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]
    filterset_fields = ("role", "clinic", "is_active")
    search_fields = ("username", "email", "first_name", "last_name", "license_number")

    def perform_create(self, serializer):
        user = serializer.save()
        audit(self.request, "CREATE", user, {"module": "users"})

    def perform_update(self, serializer):
        user = serializer.save()
        audit(self.request, "UPDATE", user, {"module": "users"})

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        audit(self.request, "DEACTIVATE", instance, {"module": "users"})
