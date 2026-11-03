from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import UserViewSet, signing_key

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
urlpatterns = [path("users/me/signing-key/", signing_key, name="user-signing-key")] + router.urls
