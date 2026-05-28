from rest_framework.routers import DefaultRouter
from .views import ClinicalNoteViewSet

router = DefaultRouter()
router.register("clinical-notes", ClinicalNoteViewSet, basename="clinical-notes")
urlpatterns = router.urls
