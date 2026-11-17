import json
from pathlib import Path
import subprocess
import sys
import unittest

from scripts.audit_data_inventory import compare_inventory, forbid_database_access, model_policy


BACKEND = Path(__file__).resolve().parents[1]


class DataInventoryTests(unittest.TestCase):
    def test_actual_schema_matches_the_reviewed_inventory(self):
        result = subprocess.run([sys.executable, "scripts/audit_data_inventory.py", "--check"],
                                cwd=BACKEND, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("no database queries", result.stdout)

    def test_changed_schema_is_rejected(self):
        with self.assertRaises(ValueError):
            compare_inventory({"fields": ["known"]}, {"fields": ["known", "new"]})

    def test_unclassified_new_model_is_rejected(self):
        with self.assertRaises(ValueError):
            model_policy("synthetic.undocumented_model")

    def test_database_connection_is_forbidden(self):
        from django.db.backends.base.base import BaseDatabaseWrapper

        with forbid_database_access(), self.assertRaises(AssertionError):
            BaseDatabaseWrapper.ensure_connection(None)

    def test_secret_token_and_vector_are_not_labeled_as_encrypted(self):
        data = json.loads((BACKEND / "docs/privacy/DATA_INVENTORY.json").read_text(encoding="utf-8"))
        fields = {(model["model"], field["name"]): field for model in data["models"] for field in model["fields"]}
        self.assertEqual(fields["token_blacklist.outstandingtoken", "token"]["protection"], "bearer_token_not_field_encrypted")
        self.assertEqual(fields["ai_analysis.vaultnode", "embedding"]["protection"], "vector_not_field_encrypted")
        self.assertEqual(fields["clinical_notes.clinicalnote", "raw_text"]["aad_scope"], "clinical_notes.clinicalnote.raw_text")


if __name__ == "__main__":
    unittest.main()
