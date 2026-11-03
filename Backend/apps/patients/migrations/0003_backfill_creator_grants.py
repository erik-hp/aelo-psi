from django.db import migrations


def backfill(apps, schema_editor):
    Patient = apps.get_model("patients", "Patient")
    Grant = apps.get_model("patients", "PatientAccess")
    for p in Patient.objects.filter(deleted_at__isnull=True).select_related("created_by", "clinic").iterator():
        u = p.created_by
        if (u.is_active and u.role == "PSYCHOLOGIST" and u.clinic_id == p.clinic_id
                and p.clinic.is_active and p.clinic.deleted_at is None):
            Grant.objects.get_or_create(
                patient_id=p.pk, user_id=u.pk,
                defaults={"can_edit": True, "granted_by_id": u.pk},
            )


class Migration(migrations.Migration):
    dependencies = [("patients", "0002_initial")]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
