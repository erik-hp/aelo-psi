from rest_framework.permissions import BasePermission

from .access import can_edit_patient, can_view_patient


class PatientObjectPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return can_view_patient(request.user, obj)
        return can_edit_patient(request.user, obj)
