"""JWT authentication requiring an active account and an active clinic."""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .policy import active_clinic_account


class ClinicJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not active_clinic_account(user):
            raise AuthenticationFailed("Authentication credentials are no longer valid.")
        return user
