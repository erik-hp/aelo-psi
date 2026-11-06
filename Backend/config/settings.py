from datetime import timedelta
from pathlib import Path
import base64
import binascii
import os
from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
if len(SECRET_KEY) < 50 or SECRET_KEY.startswith(("replace-with", "change-me", "django-insecure-", "CHANGE_ME")):
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be a unique random secret with at least 50 characters.")
CLINICAL_DATA_KEYS = [key.strip() for key in os.getenv("CLINICAL_DATA_KEYS", "").split(",") if key.strip()]
AUDIT_LOG_HMAC_KEY = os.getenv("AUDIT_LOG_HMAC_KEY", "")
CLINICAL_RETENTION_DAYS = int(os.getenv("CLINICAL_RETENTION_DAYS", "0"))
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() == "true"
AELO_ENABLE_DJANGO_ADMIN = DEBUG and os.getenv("AELO_ENABLE_DJANGO_ADMIN", "False").lower() == "true"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
if not DEBUG and (len(POSTGRES_PASSWORD) < 12 or POSTGRES_PASSWORD.startswith(("replace-with", "change-me", "CHANGE_ME"))):
    raise ImproperlyConfigured("Set a strong POSTGRES_PASSWORD outside development.")


def origins_from_env(name):
    """Local browser origins are a development convenience, never a production default."""
    configured = os.getenv(name, "http://localhost:3000" if DEBUG else "")
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "apps.users",
    "apps.clinics",
    "apps.patients",
    "apps.therapy_sessions",
    "apps.clinical_notes",
    "apps.ai_analysis",
    "apps.audit_logs",
    "apps.authentication",
    "apps.dashboard",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "services.security.middleware.NoStoreApiMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "aelo"),
        "USER": os.getenv("POSTGRES_USER", "aelo"),
        "PASSWORD": POSTGRES_PASSWORD,
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

AUTH_USER_MODEL = "users.User"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.authentication.jwt.ClinicJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("DRF_ANON_THROTTLE", "60/hour"),
        "user": os.getenv("DRF_USER_THROTTLE", "1000/hour"),
        "login": os.getenv("DRF_LOGIN_THROTTLE", "10/minute"),
        "ai": os.getenv("DRF_AI_THROTTLE", "30/hour"),
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "EXCEPTION_HANDLER": "apps.audit_logs.exception_handler.audited_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "15"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

CORS_ALLOWED_ORIGINS = origins_from_env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = (*default_headers, "x-aelo-session")
CSRF_TRUSTED_ORIGINS = origins_from_env("CSRF_TRUSTED_ORIGINS")

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai-service:8001")
AI_SERVICE_TIMEOUT = float(os.getenv("AI_SERVICE_TIMEOUT", "90"))
AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")
# Layered retrieval stays off until the decision recorded in ADR-003 is approved.
AI_LOD_RETRIEVAL = os.getenv("AI_LOD_RETRIEVAL", "False").lower() == "true"
AI_LOD_MAX_REMOTE_NOTES = max(1, min(5, int(os.getenv("AI_LOD_MAX_REMOTE_NOTES", "2"))))

# Enable only behind a reverse proxy that overwrites client-supplied scheme headers.
TRUST_PROXY_HEADERS = os.getenv("DJANGO_TRUST_PROXY_HEADERS", "False").lower() == "true"
if TRUST_PROXY_HEADERS:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
REQUIRE_HTTPS = os.getenv("DJANGO_REQUIRE_HTTPS", "False").lower() == "true"
SECURE_SSL_REDIRECT = REQUIRE_HTTPS
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_HSTS_SECONDS", "0")) if REQUIRE_HTTPS else 0
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = REQUIRE_HTTPS or not DEBUG
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = REQUIRE_HTTPS or not DEBUG
X_FRAME_OPTIONS = "DENY"

if REQUIRE_HTTPS:
    if DEBUG:
        raise ImproperlyConfigured("HTTPS deployment requires DEBUG=False.")
    if (not CLINICAL_DATA_KEYS or len(AUDIT_LOG_HMAC_KEY) < 32 or AUDIT_LOG_HMAC_KEY.startswith("replace-with")
            or len(AI_SERVICE_TOKEN) < 32 or AI_SERVICE_TOKEN.startswith("replace-with")):
        raise ImproperlyConfigured("HTTPS deployment requires independent clinical, audit, and AI service keys.")
    try:
        decoded_keys = [base64.b64decode(key.encode("ascii"), altchars=b"-_", validate=True) for key in CLINICAL_DATA_KEYS]
    except (ValueError, UnicodeEncodeError, binascii.Error) as exc:
        raise ImproperlyConfigured("CLINICAL_DATA_KEYS must contain valid base64 encoded keys.") from exc
    if any(len(key) != 32 for key in decoded_keys):
        raise ImproperlyConfigured("Every CLINICAL_DATA_KEYS key must contain 32 random bytes.")
