from rest_framework import viewsets
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from apps.audit_logs.services import audit
from .models import User
from .serializers import UserSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_role)


class UserViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return User.objects.select_related('clinic').filter(clinic_id=self.request.user.clinic_id).order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]
    filterset_fields = ("role", "clinic", "is_active")
    search_fields = ("username", "email", "first_name", "last_name", "license_number")

    def perform_create(self, serializer):
        if not self.request.user.clinic_id:
            raise PermissionDenied('Clinic is required.')
        user = serializer.save(clinic_id=self.request.user.clinic_id)
        audit(self.request, "CREATE", user, {"module": "users"})

    def perform_update(self, serializer):
        user = serializer.save(clinic_id=self.request.user.clinic_id)
        audit(self.request, "UPDATE", user, {"module": "users"})

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        audit(self.request, "DEACTIVATE", instance, {"module": "users"})
