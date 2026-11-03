from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ClinicalNoteViewSet, clinical_draft, preview_ai_text

router = DefaultRouter()
router.register("clinical-notes", ClinicalNoteViewSet, basename="clinical-notes")
urlpatterns = [
    path("clinical-notes/drafts/<uuid:patient_id>/", clinical_draft, name="clinical-draft"),
    path("clinical-notes/preview-ai/", preview_ai_text, name="clinical-preview-ai"),
] + router.urls
