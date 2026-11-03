from rest_framework.permissions import BasePermission
from apps.users.models import UserRole


class CanRequestAI(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (getattr(user, "is_admin_role", False) or user.role in {UserRole.PSYCHOLOGIST, UserRole.INTERN})
        )


class CanReviewAI(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.PSYCHOLOGIST)
