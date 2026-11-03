from django.conf import settings
from urllib.parse import urlsplit
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.audit_logs.services import audit
from .serializers import LoginSerializer


def trusted_browser_origin(request):
    origin = request.headers.get("Origin")
    if not origin:
        referrer = request.headers.get("Referer", "")
        parsed = urlsplit(referrer)
        origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme in {"http", "https"} and parsed.netloc else ""
    expected = {value.rstrip("/") for value in settings.CORS_ALLOWED_ORIGINS}
    expected.add(f"{request.scheme}://{request.get_host()}")
    return bool(origin and origin in expected)


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        if not trusted_browser_origin(request):
            return Response({"code": "UNTRUSTED_ORIGIN"}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except AuthenticationFailed:
            audit(request, "LOGIN_FAILED", self, {"module": "authentication"})
            raise
        audit(request, "LOGIN", serializer.user, {"module": "authentication"})
        data = dict(serializer.validated_data)
        refresh = data.pop("refresh")
        response = Response(data, status=status.HTTP_200_OK)
        set_refresh_cookie(response, refresh)
        return response


class RefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        if request.headers.get("X-AELO-Session") != "1" or not trusted_browser_origin(request):
            return Response({"detail": "Session header is required."}, status=status.HTTP_403_FORBIDDEN)
        refresh = request.COOKIES.get("aelo_refresh")
        if not refresh:
            return Response({"detail": "Refresh session is missing."}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = self.get_serializer(data={"refresh": refresh})
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        rotated = data.pop("refresh", None)
        response = Response(data, status=status.HTTP_200_OK)
        if rotated:
            set_refresh_cookie(response, rotated)
        return response


class LogoutView(APIView):
    def post(self, request):
        if request.headers.get("X-AELO-Session") != "1" or not trusted_browser_origin(request):
            return Response({"detail": "Session header is required."}, status=status.HTTP_403_FORBIDDEN)
        refresh = request.COOKIES.get("aelo_refresh")
        if refresh:
            try:
                token = RefreshToken(refresh)
                token.blacklist()
            except TokenError:
                pass
        audit(request, "LOGOUT", request.user, {"module": "authentication"})
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie("aelo_refresh", path="/api/auth/", samesite="Strict")
        return response


def set_refresh_cookie(response, token):
    response.set_cookie(
        "aelo_refresh", token, httponly=True, secure=settings.REQUIRE_HTTPS,
        samesite="Strict", path="/api/auth/",
    )


@api_view(["GET"])
def current_user(request):
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "clinic_id": str(user.clinic_id) if user.clinic_id else None,
    })
