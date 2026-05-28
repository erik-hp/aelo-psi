from rest_framework.permissions import BasePermission
from apps.users.models import UserRole
from .models import PatientAccess


class PatientObjectPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_admin_role:
            return True
        if obj.clinic_id != user.clinic_id:
            return False
        if user.role == UserRole.PSYCHOLOGIST and obj.created_by_id == user.id:
            return True
        access = PatientAccess.objects.filter(patient=obj, user=user).first()
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return access is not None
        return bool(access and access.can_edit) or user.role == UserRole.PSYCHOLOGIST
