from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from .policy import active_clinic_account


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["clinic_id"] = str(user.clinic_id) if user.clinic_id else None
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not active_clinic_account(self.user):
            raise AuthenticationFailed('Account or clinic is not active.')
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "role": self.user.role,
            "clinic_id": str(self.user.clinic_id) if self.user.clinic_id else None,
        }
        return data
