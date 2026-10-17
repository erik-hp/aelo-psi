"""Single, deny-by-default policy for patient access.

Administrative access to demographic metadata is not the same as clinical
record access. No cross-clinic data, including for Django superusers.
"""
from django.db.models import Q
from apps.users.models import UserRole
from .models import Patient


def accessible_patients(user, *, clinical=False, write=False):
    qs = Patient.objects.filter(deleted_at__isnull=True)
    if (
        not getattr(user, "is_authenticated", False)
        or not getattr(user, "is_active", False)
        or not getattr(user, "clinic_id", None)
    ):
        return qs.none()

    qs = qs.filter(clinic_id=user.clinic_id)

    # A clinic administrator manages the clinic's patient directory but
    # requires an explicit patient grant for clinical material.
    if user.is_admin_role and not clinical:
        return qs

    grants = Q(access_grants__user=user)
    if write:
        grants &= Q(access_grants__can_edit=True)

    if user.role == UserRole.PSYCHOLOGIST:
        grants |= Q(created_by=user)

    return qs.filter(grants).distinct()


def can_access_patient(user, patient, *, clinical=False, write=False):
    return accessible_patients(user, clinical=clinical, write=write).filter(pk=patient.pk).exists()
