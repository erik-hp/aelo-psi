from django.contrib import admin
from .models import Clinic


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ("name", "document", "is_active", "created_at", "deleted_at")
    list_filter = ("is_active", "deleted_at")
    search_fields = ("name", "document")
    readonly_fields = ("id", "created_at", "updated_at", "deleted_at")
