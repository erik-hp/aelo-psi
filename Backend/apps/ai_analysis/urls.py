from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AIAnalysisViewSet, request_analysis, read_analysis_job, patient_vault, build_vault_checkpoint, read_vault_checkpoint, read_vault_job

router = DefaultRouter()
router.register("analysis", AIAnalysisViewSet, basename="analysis")
urlpatterns = [
    path("analysis/request/", request_analysis, name="analysis-request"),
    path("analysis/jobs/<uuid:job_id>/", read_analysis_job, name="analysis-job-read"),
    path("vault/patients/<uuid:patient_id>/", patient_vault, name="patient-vault"),
    path("vault/analyses/<uuid:analysis_id>/checkpoint/", build_vault_checkpoint, name="vault-checkpoint-create"),
    path("vault/jobs/<uuid:job_id>/", read_vault_job, name="vault-job-read"),
    path("vault/checkpoints/<uuid:checkpoint_id>/", read_vault_checkpoint, name="vault-checkpoint-read"),
] + router.urls
