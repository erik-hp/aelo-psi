"""Server-side account eligibility for all API authentication flows.

JWT claims identifying a role/clinic are snapshots, not authorization facts.
The current database state is authoritative for login, refresh and API access.
"""


def active_clinic_account(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False) or not user.is_active:
        return False
    if not user.clinic_id:
        return False
    clinic = user.clinic
    return bool(clinic and clinic.is_active and clinic.deleted_at is None)
