"""Keep relational filter validation and HTML choices inside the caller's scope."""

from django_filters import ModelChoiceFilter, ModelMultipleChoiceFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.clinics.models import Clinic
from apps.patients.access import accessible_patients
from apps.patients.models import Patient
from apps.therapy_sessions.models import TherapySession
from apps.users.models import User


class ScopedRelationFilterBackend(DjangoFilterBackend):
    def get_filterset(self, request, queryset, view):
        filterset = super().get_filterset(request, queryset, view)
        if filterset is None:
            return None
        for field in filterset.filters.values():
            if not isinstance(field, (ModelChoiceFilter, ModelMultipleChoiceFilter)):
                continue
            choices = field.get_queryset(request)
            if choices is None:
                continue
            user = request.user
            clinic_id = getattr(user, "clinic_id", None)
            if not getattr(user, "is_authenticated", False) or not clinic_id:
                choices = choices.none()
            elif choices.model is Patient:
                choices = choices.filter(pk__in=accessible_patients(user, clinical=True).values("pk"))
            elif choices.model is TherapySession:
                choices = choices.filter(
                    deleted_at__isnull=True,
                    patient__in=accessible_patients(user, clinical=True),
                )
            elif choices.model is User:
                choices = choices.filter(clinic_id=clinic_id)
            elif choices.model is Clinic:
                choices = choices.filter(pk=clinic_id, is_active=True, deleted_at__isnull=True)
            else:
                # New relation filters need an explicit authorization policy.
                choices = choices.none()
            field.queryset = choices
        return filterset
