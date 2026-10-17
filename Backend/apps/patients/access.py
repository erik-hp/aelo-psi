"""Tenant-scoped access rules. Clinical access requires an explicit grant.

Creator ownership is only used when bootstrapping a grant (see migration 0003).
It must *never* bypass revocation.
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

    qs = qs.filter(clinic_id=user.clinic_id, clinic__is_active=True, clinic__deleted_at__isnull=True)

    # Administrative directory access does not imply a clinical grant.
    if user.is_admin_role:
        return qs.none() if clinical else qs

    if user.role not in {UserRole.PSYCHOLOGIST, UserRole.INTERN}:
        return qs.none()

    grant = Q(access_grants__user=user)
    if write:
        grant &= Q(access_grants__can_edit=True)
    return qs.filter(grant).distinct()


def can_access_patient(user, patient, *, clinical=False, write=False):
    return accessible_patients(user, clinical=clinical, write=write).filter(pk=patient.pk).exists()
