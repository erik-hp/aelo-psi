from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("api/auth/", include("apps.authentication.urls")),
    path("api/", include("apps.users.urls")),
    path("api/", include("apps.patients.urls")),
    path("api/", include("apps.therapy_sessions.urls")),
    path("api/", include("apps.clinical_notes.urls")),
    path("api/", include("apps.ai_analysis.urls")),
    path("api/", include("apps.audit_logs.urls")),
    path("api/", include("apps.dashboard.urls")),
]

# Django admin bypasses the DRF patient-permission layer. Do not expose it
# outside explicit local development until object-level admin policies exist.
if settings.DEBUG and getattr(settings, "AELO_ENABLE_DJANGO_ADMIN", False):
    urlpatterns.append(path("admin/", admin.site.urls))
