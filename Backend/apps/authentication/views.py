from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from .policy import active_clinic_account
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.audit_logs.services import audit
from .serializers import LoginSerializer


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        audit(request, "LOGIN", serializer.user, {"module": "authentication"})
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        raw = request.data.get("refresh")
        if not isinstance(raw, str) or not raw:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            token = RefreshToken(raw)
            user_id = token.get("user_id")
            user = get_user_model().objects.select_related("clinic").get(pk=user_id)
        except (TokenError, ValueError, TypeError, get_user_model().DoesNotExist):
            raise AuthenticationFailed("Invalid refresh credentials.") from None
        if not active_clinic_account(user):
            raise AuthenticationFailed("Account or clinic is not active.")
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh)
            if str(token.get("user_id")) != str(request.user.pk):
                return Response({"detail": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Invalid refresh token."}, status=status.HTTP_400_BAD_REQUEST)
        audit(request, "LOGOUT", request.user, {"module": "authentication"})
        return Response(status=status.HTTP_204_NO_CONTENT)
