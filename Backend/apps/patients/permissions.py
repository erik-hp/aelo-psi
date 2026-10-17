from rest_framework.permissions import BasePermission
from .access import can_access_patient


class PatientObjectPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        return can_access_patient(user, obj, write=request.method not in ('GET', 'HEAD', 'OPTIONS'))
