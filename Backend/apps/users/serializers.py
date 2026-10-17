"""Tenant administrators may provision staff but never privileged identities."""
from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers

from .models import UserRole

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name", "role",
            "clinic", "license_number", "is_active", "password",
        )
        # Clinic is always assigned by the authenticated server-side context.
        # Provisioning ADMIN/superuser accounts is an out-of-band operation.
        read_only_fields = ("id", "clinic")

    def validate_role(self, role):
        if role not in {UserRole.PSYCHOLOGIST, UserRole.INTERN}:
            raise serializers.ValidationError("Privileged accounts cannot be created or assigned through this API.")
        return role

    def validate(self, attrs):
        if self.instance and (self.instance.role == UserRole.ADMIN or self.instance.is_superuser):
            raise serializers.ValidationError("Privileged accounts must be managed outside this API.")
        password = attrs.get("password")
        if password is not None:
            candidate = self.instance or User(username=attrs.get("username", ""), email=attrs.get("email", ""))
            try:
                password_validation.validate_password(password, user=candidate)
            except Exception as exc:
                from django.core.exceptions import ValidationError
                if not isinstance(exc, ValidationError):
                    raise
                raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
