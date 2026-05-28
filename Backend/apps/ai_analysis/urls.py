from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AIAnalysisViewSet, request_analysis

router = DefaultRouter()
router.register("analysis", AIAnalysisViewSet, basename="analysis")
urlpatterns = [
    path("analysis/request/", request_analysis, name="analysis-request"),
] + router.urls
