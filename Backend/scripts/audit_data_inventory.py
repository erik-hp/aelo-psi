"""Export/check schema metadata for F0-06 without opening a database connection."""

import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import sys
from unittest.mock import patch


BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
DEFAULT_INVENTORY = BACKEND / "docs/privacy/DATA_INVENTORY.json"
POLICIES = {}
for category, retention, labels in (
    ("identity_and_access", "RET-01", ("clinics.clinic", "users.user", "patients.patient", "patients.patientaccess")),
    ("signing_public_material", "RET-04", ("users.usersigningkey",)),
    ("clinical_record", "RET-02", ("therapy_sessions.therapysession", "clinical_notes.clinicalnote", "clinical_notes.clinicalnotehistory")),
    ("clinical_draft", "RET-03", ("clinical_notes.clinicalnotedraft",)),
    ("clinical_derived", "RET-02", ("ai_analysis.aianalysis", "ai_analysis.aisource", "ai_analysis.humanvalidation", "ai_analysis.sentimentmetric", "ai_analysis.vaultnode", "ai_analysis.vaultedge", "ai_analysis.vaultcheckpoint")),
    ("clinical_job_metadata", "RET-02", ("ai_analysis.vaultjob", "ai_analysis.noteextractionjob", "ai_analysis.analysisjob")),
    ("security_audit", "RET-05", ("audit_logs.auditlog", "audit_logs.auditchainstate")),
    ("framework_identity_and_access", "RET-01", ("auth.group", "auth.permission", "contenttypes.contenttype", "admin.logentry")),
    ("framework_session_and_tokens", "RET-06", ("sessions.session", "token_blacklist.outstandingtoken", "token_blacklist.blacklistedtoken")),
):
    for label in labels:
        POLICIES[label] = {"category": category, "retention_decision": retention}


@contextmanager
def forbid_database_access():
    with patch("django.db.backends.base.base.BaseDatabaseWrapper.ensure_connection",
               side_effect=AssertionError("Inventory generation must not access a database")):
        yield


def model_policy(label):
    if label not in POLICIES:
        raise ValueError(f"Classify the new model before updating the inventory: {label}")
    return POLICIES[label]


def collect_schema():
    sys.path.insert(0, str(BACKEND))
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings_test"
    import django
    from django.apps import apps
    from services.security.encrypted_fields import EncryptedJSONField, EncryptedTextField

    with forbid_database_access():
        django.setup()
        models = []
        for model in sorted(apps.get_models(), key=lambda item: item._meta.label_lower):
            label = model._meta.label_lower
            policy = model_policy(label)
            fields = []
            for field in [*model._meta.local_fields, *model._meta.local_many_to_many]:
                protection = "not_field_encrypted"
                aad = None
                if isinstance(field, (EncryptedTextField, EncryptedJSONField)):
                    protection = "aes_gcm_field"
                    aad = f"{label}.{field.name}"
                elif label == "users.user" and field.name == "password":
                    protection = "password_hash"
                elif label == "token_blacklist.outstandingtoken" and field.name == "token":
                    protection = "bearer_token_not_field_encrypted"
                elif label == "sessions.session" and field.name == "session_data":
                    protection = "session_blob_not_field_encrypted"
                elif field.__class__.__name__ == "VectorField":
                    protection = "vector_not_field_encrypted"
                entry = {"name": field.name, "type": field.__class__.__name__, "column": field.column,
                         "nullable": field.null, "protection": protection}
                if aad:
                    entry["aad_scope"] = aad
                if field.is_relation:
                    entry["related_model"] = field.related_model._meta.label_lower
                if field.many_to_many:
                    entry["join_table"] = field.remote_field.through._meta.db_table
                fields.append(entry)
            module = model.__module__
            source = f"Backend/{module.replace('.', '/')}.py" if module.startswith("apps.") else f"dependency:{module}"
            models.append({"model": label, "source": source, "table": model._meta.db_table,
                           "scope": "domain" if module.startswith("apps.") else "framework",
                           **policy, "fields": fields})
    return {"schema": 1, "method": "django_model_metadata_without_database_access",
            "contains_record_values": False,
            "limitations": ["Declared model schema, not a deployed-database inspection",
                            "Field encryption does not cover all identifiers, metadata or vectors",
                            "AAD currently binds model/field, not clinic/patient/record",
                            "Framework tables being installed does not prove they contain data"],
            "models": models}


def compare_inventory(expected, actual):
    if expected != actual:
        raise ValueError("Data inventory differs from the declared schema; review and regenerate it")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare declared schema with the inventory")
    parser.add_argument("--write", action="store_true", help="Update only the repository's fixed inventory file")
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY, help="Existing inventory to check")
    args = parser.parse_args(argv)
    if args.check == args.write:
        parser.error("Choose exactly one of --check or --write")
    try:
        actual = collect_schema()
        if args.write:
            if not DEFAULT_INVENTORY.resolve().is_relative_to(BACKEND.resolve()):
                raise ValueError("Inventory output must stay within Backend")
            DEFAULT_INVENTORY.parent.mkdir(parents=True, exist_ok=True)
            DEFAULT_INVENTORY.write_text(json.dumps(actual, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        else:
            expected = json.loads(args.inventory.read_text(encoding="utf-8"))
            compare_inventory(expected, actual)
        fields = sum(len(model["fields"]) for model in actual["models"])
        print(f"DATA_INVENTORY_OK: {len(actual['models'])} models, {fields} fields; no database queries")
        return 0
    except (ValueError, AssertionError, OSError) as error:
        print(f"DATA_INVENTORY_ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
