from django.contrib import admin
from .models import ClinicalNote, ClinicalNoteHistory


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = ("patient", "session", "author", "version", "created_at", "deleted_at")
    list_filter = ("author", "deleted_at", "created_at")
    search_fields = ("patient__display_name", "patient__internal_code", "raw_text")
    readonly_fields = ("id", "anonymized_text", "version", "created_at", "updated_at", "deleted_at")


@admin.register(ClinicalNoteHistory)
class ClinicalNoteHistoryAdmin(admin.ModelAdmin):
    list_display = ("note", "edited_by", "version", "created_at")
    readonly_fields = ("id", "created_at", "updated_at")
