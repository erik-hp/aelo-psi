from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from .policy import active_clinic_account


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["clinic_id"] = str(user.clinic_id) if user.clinic_id else None
        return token

    def validate(self, attrs):
        identifier = attrs.get(self.username_field, "")
        if "@" in identifier:
            matches = list(get_user_model().objects.filter(email__iexact=identifier).values_list("username", flat=True)[:2])
            if len(matches) == 1:
                attrs[self.username_field] = matches[0]
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
