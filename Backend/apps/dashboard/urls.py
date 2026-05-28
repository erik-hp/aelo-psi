from django.urls import path
from .views import longitudinal_dashboard

urlpatterns = [
    path("dashboard/longitudinal", longitudinal_dashboard, name="dashboard-longitudinal"),
]
