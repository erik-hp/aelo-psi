from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/", include("apps.users.urls")),
    path("api/", include("apps.patients.urls")),
    path("api/", include("apps.therapy_sessions.urls")),
    path("api/", include("apps.clinical_notes.urls")),
    path("api/", include("apps.ai_analysis.urls")),
    path("api/", include("apps.audit_logs.urls")),
    path("api/", include("apps.dashboard.urls")),
]
