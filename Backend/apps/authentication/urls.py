from django.urls import path
from .views import LoginView, LogoutView, RefreshView, current_user

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", current_user, name="auth-me"),
]
