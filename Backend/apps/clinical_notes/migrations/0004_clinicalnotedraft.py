import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import services.security.encrypted_fields


class Migration(migrations.Migration):
    dependencies = [
        ("clinical_notes", "0003_alter_clinicalnote_anonymized_text_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("patients", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClinicalNoteDraft",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", services.security.encrypted_fields.EncryptedTextField(blank=True)),
                ("content", services.security.encrypted_fields.EncryptedTextField(blank=True)),
                ("version", models.PositiveIntegerField(default=1)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="clinical_drafts", to="patients.patient")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="clinical_drafts", to=settings.AUTH_USER_MODEL)),
            ],
            options={"constraints": [models.UniqueConstraint(fields=("patient", "user"), name="uniq_clinical_draft_user_patient")]},
        ),
    ]
