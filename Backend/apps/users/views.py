from rest_framework import viewsets
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from apps.ai_analysis.permissions import CanReviewAI
from apps.ai_analysis.signatures import public_key_from_spki
from django.db.models import Q
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from apps.audit_logs.services import audit
from .models import User, UserSigningKey
from .serializers import UserSerializer


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_role and request.user.clinic_id)


class UserViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return User.objects.select_related('clinic').filter(
            clinic_id=self.request.user.clinic_id,
        ).exclude(Q(role='ADMIN') | Q(is_superuser=True)).order_by('username')
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


@api_view(["GET", "POST"])
@permission_classes([CanReviewAI])
def signing_key(request):
    existing = UserSigningKey.objects.filter(user=request.user).first()
    if request.method == "GET":
        return Response({"registered": bool(existing), "fingerprint": existing.fingerprint if existing else None})
    encoded = request.data.get("public_key_spki")
    if not isinstance(encoded, str) or len(encoded) > 1024:
        return Response({"public_key_spki": "A base64 encoded public key is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        _, fingerprint = public_key_from_spki(encoded)
    except ValueError as exc:
        return Response({"public_key_spki": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if existing:
        if existing.fingerprint != fingerprint:
            return Response({"detail": "A different signing key is already registered for this account."}, status=status.HTTP_409_CONFLICT)
        return Response({"registered": True, "fingerprint": fingerprint})
    if UserSigningKey.objects.filter(fingerprint=fingerprint).exists():
        return Response({"detail": "This signing key is already registered to another account."}, status=status.HTTP_409_CONFLICT)
    key = UserSigningKey.objects.create(user=request.user, public_key_spki=encoded, fingerprint=fingerprint)
    audit(request, "SIGNING_KEY_REGISTER", key, {"fingerprint": fingerprint})
    return Response({"registered": True, "fingerprint": fingerprint}, status=status.HTTP_201_CREATED)
