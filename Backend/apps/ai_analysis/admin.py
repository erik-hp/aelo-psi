from django.contrib import admin
from .models import AIAnalysis, AISource, HumanValidation, SentimentMetric


class AISourceInline(admin.TabularInline):
    model = AISource
    extra = 0
    readonly_fields = ("id", "created_at")


class SentimentMetricInline(admin.TabularInline):
    model = SentimentMetric
    extra = 0
    readonly_fields = ("id", "created_at")


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = ("patient", "requested_by", "status", "relevance_score", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("patient__display_name", "patient__internal_code")
    readonly_fields = ("id", "raw_response", "created_at", "updated_at")
    inlines = (AISourceInline, SentimentMetricInline)


@admin.register(HumanValidation)
class HumanValidationAdmin(admin.ModelAdmin):
    list_display = ("analysis", "reviewed_by", "decision", "created_at")
    list_filter = ("decision", "created_at")
    readonly_fields = ("id", "created_at", "updated_at")
