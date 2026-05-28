from django.contrib import admin
from .models import Patient, PatientAccess


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("internal_code", "display_name", "clinic", "status", "created_at", "deleted_at")
    list_filter = ("clinic", "status", "deleted_at")
    search_fields = ("internal_code", "display_name")
    readonly_fields = ("id", "created_at", "updated_at", "deleted_at")


@admin.register(PatientAccess)
class PatientAccessAdmin(admin.ModelAdmin):
    list_display = ("patient", "user", "can_edit", "granted_by", "created_at")
    list_filter = ("can_edit",)
    search_fields = ("patient__display_name", "user__username")
