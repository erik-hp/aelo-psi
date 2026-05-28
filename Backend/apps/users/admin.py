from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class AeloUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "clinic", "is_active", "is_staff")
    list_filter = ("role", "clinic", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name", "license_number")
    fieldsets = UserAdmin.fieldsets + (
        ("AELO", {"fields": ("role", "clinic", "license_number")}),
    )
