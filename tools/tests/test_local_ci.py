import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

from Backend.scripts.verify_requirements import verify
from tools.local_ci import Pipeline, StepFailed, inside, verify_report


class LocalPipelineTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.root = Path(self.folder.name)
        self.source = self.root / "source"
        self.source.mkdir()
        self.pipeline = Pipeline(self.root, self.source, "a" * 40)

    def tearDown(self):
        # TemporaryDirectory owns this freshly allocated test directory.
        assert self.root.resolve().parent == Path(tempfile.gettempdir()).resolve()
        self.folder.cleanup()

    def test_success_produces_a_verifiable_commit_report(self):
        self.pipeline.run("success", [sys.executable, "-c", "print('ok')"], expected="ok")
        self.pipeline.finish(True, {})
        self.assertEqual(verify_report(self.root), "a" * 40)

    def test_command_failure_does_not_pass_verification(self):
        with self.assertRaises(StepFailed):
            self.pipeline.run("failure", [sys.executable, "-c", "raise SystemExit(7)"])
        self.pipeline.finish(False, {})
        self.assertEqual(self.pipeline.steps[0]["exit_code"], 7)
        with self.assertRaises(ValueError):
            verify_report(self.root)

    def test_wrong_container_user_is_a_failure_even_with_zero_exit(self):
        with self.assertRaises(StepFailed):
            self.pipeline.run("user", [sys.executable, "-c", "print('0')"], expected="10001")

    def test_timeout_is_a_failure(self):
        with self.assertRaises(StepFailed):
            self.pipeline.run("timeout", [sys.executable, "-c", "import time; time.sleep(5)"], timeout=0.05)
        self.assertEqual(self.pipeline.steps[0]["exit_code"], 124)

    def test_secret_scanner_output_is_never_saved(self):
        with self.assertRaises(StepFailed):
            self.pipeline.run("secret", [sys.executable, "-c", "print('SYNTHETIC-SECRET'); raise SystemExit(1)"], hidden=True)
        self.assertNotIn("SYNTHETIC-SECRET", (self.root / self.pipeline.steps[0]["log"]).read_text())

    def test_changed_artifact_is_rejected(self):
        self.pipeline.run("success", [sys.executable, "-c", "print('ok')"])
        self.pipeline.finish(True, {})
        (self.root / self.pipeline.steps[0]["log"]).write_text("changed")
        with self.assertRaises(ValueError):
            verify_report(self.root)

    def test_changed_manifest_is_rejected(self):
        self.pipeline.run("success", [sys.executable, "-c", "print('ok')"])
        self.pipeline.finish(True, {})
        data = json.loads((self.root / "manifest.json").read_text())
        data["commit"] = "b" * 40
        (self.root / "manifest.json").write_text(json.dumps(data))
        with self.assertRaises(ValueError):
            verify_report(self.root)

    def test_artifact_cannot_leave_report_directory(self):
        with self.assertRaises(ValueError):
            inside(self.root, "../outside")

    def test_empty_execution_cannot_be_verified(self):
        self.pipeline.finish(True, {})
        with self.assertRaises(ValueError):
            verify_report(self.root)

    def test_lock_input_drift_is_rejected(self):
        inputs = ["base.txt", "ai.txt", "dev.txt", "ci.in"]
        locks = [f"{name}.linux-py312.lock" for name in ("base", "ai", "ci")]
        data = {"platform": "linux", "python": "3.12"}
        for group, names in (("inputs", inputs), ("locks", locks)):
            data[group] = {}
            for name in names:
                (self.root / name).write_bytes(b"synthetic fixture")
                data[group][name] = hashlib.sha256(b"synthetic fixture").hexdigest()
        (self.root / "locks.json").write_text(json.dumps(data))
        verify(self.root)
        (self.root / "base.txt").write_text("changed dependency")
        with self.assertRaises(ValueError):
            verify(self.root)


if __name__ == "__main__":
    unittest.main()
