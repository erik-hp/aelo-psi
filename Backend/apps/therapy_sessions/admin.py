from django.contrib import admin
from .models import TherapySession


@admin.register(TherapySession)
class TherapySessionAdmin(admin.ModelAdmin):
    list_display = ("patient", "professional", "scheduled_at", "status", "created_at")
    list_filter = ("status", "professional", "deleted_at")
    search_fields = ("patient__display_name", "patient__internal_code", "professional__username")
    readonly_fields = ("id", "created_at", "updated_at", "deleted_at")
