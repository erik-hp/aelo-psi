"""Single source of truth for access to a patient's clinical records."""

from django.db.models import Q

from apps.users.models import UserRole

from .models import Patient, PatientAccess


def accessible_patients(user):
    patients = Patient.objects.filter(deleted_at__isnull=True).order_by("display_name", "id")
    if not user or not user.is_authenticated:
        return patients.none()
    if user.is_admin_role:
        return patients.filter(clinic_id=user.clinic_id) if user.clinic_id else patients.none()

    grants = Q(access_grants__user=user)
    if user.role == UserRole.PSYCHOLOGIST:
        grants |= Q(created_by=user)
    return patients.filter(clinic_id=user.clinic_id).filter(grants).distinct()


def can_view_patient(user, patient):
    if not user or not user.is_authenticated or patient.deleted_at is not None:
        return False
    if user.clinic_id is None or patient.clinic_id != user.clinic_id:
        return False
    if user.is_admin_role:
        return True
    if user.role == UserRole.PSYCHOLOGIST and patient.created_by_id == user.id:
        return True
    return PatientAccess.objects.filter(patient=patient, user=user).exists()


def can_edit_patient(user, patient):
    if not can_view_patient(user, patient):
        return False
    if user.is_admin_role:
        return True
    if user.role == UserRole.PSYCHOLOGIST and patient.created_by_id == user.id:
        return True
    return PatientAccess.objects.filter(patient=patient, user=user, can_edit=True).exists()
