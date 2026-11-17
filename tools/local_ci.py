"""Run the project's quality checks locally against an immutable Git snapshot.

Python >=3.12, Git and Docker Compose >=2.24.4. No third-party Python packages.
Only synthetic Compose stacks are started. No GitHub credentials or API writes.
"""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tarfile
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GITLEAKS = "ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f"


def sha256(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def inside(root, relative):
    path = (Path(root) / relative).resolve()
    if not path.is_relative_to(Path(root).resolve()):
        raise ValueError("Artifact path leaves the report directory")
    return path


def verify_report(folder):
    folder = Path(folder).resolve()
    checksums = {}
    for line in (folder / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        digest, relative = line.split("  ", 1)
        checksums[relative] = digest
    if checksums.get("manifest.json") != sha256(folder / "manifest.json"):
        raise ValueError("Manifest checksum does not match")
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("status") != "passed" or not manifest.get("artifacts"):
        raise ValueError("Report does not contain a complete successful execution")
    for relative, digest in manifest["artifacts"].items():
        path = inside(folder, relative)
        if checksums.get(relative) != digest or not path.is_file() or sha256(path) != digest:
            raise ValueError(f"Artifact is missing or changed: {relative}")
    if not manifest.get("steps") or any(step["status"] != "passed" for step in manifest["steps"]):
        raise ValueError("Report includes an incomplete or failed step")
    return manifest["commit"]


class StepFailed(RuntimeError):
    pass


class Pipeline:
    def __init__(self, output, source, commit):
        self.output, self.source, self.commit = Path(output), Path(source), commit
        self.steps = []

    def run(self, name, command, *, timeout=1800, hidden=False, expected=None):
        started = time.monotonic()
        log = self.output / f"{len(self.steps) + 1:02d}-{name}.log"
        step = {"name": name, "status": "running", "log": log.name, "command": command}
        self.steps.append(step)
        print(f"[RUN] {name}", flush=True)
        try:
            with log.open("wb") as stream:
                destination = subprocess.DEVNULL if hidden else stream
                result = subprocess.run(command, cwd=self.source, stdout=destination, stderr=destination,
                                        timeout=timeout, check=False)
            code = result.returncode
            if code == 0 and expected is not None and log.read_text(encoding="utf-8").strip() != expected:
                code = 1
            if hidden:
                log.write_text(f"Scanner output suppressed. Exit code: {code}\n", encoding="utf-8")
        except subprocess.TimeoutExpired:
            code = 124
        except OSError:
            code = 127
        step.update(exit_code=code, seconds=round(time.monotonic() - started, 2),
                    status="passed" if code == 0 else "failed")
        print(f"[{'PASS' if code == 0 else 'FAIL'}] {name} ({step['seconds']}s)", flush=True)
        if code:
            raise StepFailed(name)

    def finish(self, success, metadata):
        artifacts = {}
        for path in sorted(self.output.rglob("*")):
            if path.is_file() and not path.is_relative_to(self.source) and path.name not in {"manifest.json", "SHA256SUMS"}:
                artifacts[path.relative_to(self.output).as_posix()] = sha256(path)
        manifest = {"schema": 1, "executor": "local-docker", "commit": self.commit,
                    "status": "passed" if success else "failed", "steps": self.steps,
                    "artifacts": artifacts, **metadata}
        report = self.output / "manifest.json"
        report.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        checksums = {**artifacts, "manifest.json": sha256(report)}
        (self.output / "SHA256SUMS").write_text(
            "".join(f"{digest}  {name}\n" for name, digest in sorted(checksums.items())), encoding="utf-8")


def capture(command):
    return subprocess.run(command, cwd=ROOT, capture_output=True, check=True).stdout.decode("utf-8").strip()


def make_snapshot(ref, output_base):
    commit = capture(["git", "rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}"])
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("Expected a Git commit SHA")
    base = inside(ROOT, output_base)
    run_id = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ").lower() + "-" + uuid.uuid4().hex[:6]
    output = base / f"{run_id}-{commit[:12]}"
    output.mkdir(parents=True, exist_ok=False)
    source = output / "source"
    source.mkdir()
    archive = output / "source.tar"
    with archive.open("wb") as stream:
        subprocess.run(["git", "archive", "--format=tar", commit], cwd=ROOT, stdout=stream, check=True)
    with tarfile.open(archive) as stream:
        stream.extractall(source, filter="data")
    if sha256(source / "tools/local_ci.py") != sha256(Path(__file__)):
        raise ValueError("Commit the runner changes before validating this ref")
    return commit, run_id, output, source


def image_override(path, images):
    # Paths are relative to the first Compose file (Backend), so no host source mount.
    path.write_text(f"""services:
  backend_test:
    image: {images['test']}
""", encoding="utf-8")


def run_pipeline(ref, output_base):
    commit, run_id, output, source = make_snapshot(ref, output_base)
    pipeline = Pipeline(output, source, commit)
    prefix = f"aelo-local-{run_id}"
    projects = []
    containers = []
    images = {name: f"{prefix}-{name}:local" for name in ("test", "api", "ai", "frontend", "web")}
    metadata = {"started_utc": datetime.now(UTC).isoformat(), "source_archive_sha256": sha256(output / "source.tar"),
                "working_tree_changes_excluded": bool(capture(["git", "status", "--porcelain", "--untracked-files=no"])),
                "github_actions_used": False, "images": images}
    empty_env = output / "empty.env"
    empty_env.write_text("# No host application environment is loaded.\n", encoding="utf-8")

    def compose(stack, *args):
        project = f"{prefix}-{stack}"
        if stack == "test":
            config = "docker-compose.test.yml"
        else:
            config = "docker-compose.security.yml" if stack == "http" else "docker-compose.tls-test.yml"
        override = output / f"{stack}.override.yml"
        if not override.exists():
            if stack == "test":
                image_override(override, images)
            elif stack == "http":
                override.write_text(f"""services:
  migrate_security:
    image: {images['api']}
  api_security:
    image: {images['api']}
    ports: !reset []
  web_security:
    image: {images['web']}
    ports: !reset []
  security_smoke:
    image: {images['test']}
""", encoding="utf-8")
            else:
                override.write_text(f"""services:
  migrate_tls:
    image: {images['test']}
  api_tls:
    image: {images['api']}
  web_tls:
    image: {images['web']}
  tls_smoke:
    image: {images['test']}
""", encoding="utf-8")
            projects.append(stack)
        return ["docker", "compose", "--env-file", str(empty_env), "-p", project,
                "-f", str(source / "Backend" / config), "-f", str(override), *args]

    def backend(*command):
        return compose("test", "run", "--rm", "--no-deps", "backend_test", *command)

    def frontend(name, *command, network="none"):
        container = f"{prefix}-{name}"
        containers.append(container)
        return ["docker", "run", "--rm", "--name", container, "--network", network,
                "--mount", f"type=bind,source={output},target=/artifacts", images["frontend"], *command]

    success = False
    try:
        pipeline.run("runner-tests", [sys.executable, "-m", "unittest", "discover", "-s", "tools/tests", "-v"], timeout=120)
        pipeline.run("requirements-locks", [sys.executable, "Backend/scripts/verify_requirements.py"])
        version = capture(["docker", "compose", "version", "--short"])
        match = re.search(r"(\d+)\.(\d+)\.(\d+)", version)
        if not match or tuple(map(int, match.groups())) < (2, 24, 4):
            raise ValueError("Docker Compose >=2.24.4 is required to remove test port bindings")
        metadata["compose_version"] = version
        pipeline.run("docker-version", ["docker", "version"])
        pipeline.run("secrets-tree", ["docker", "run", "--rm", "--network", "none", "--mount",
                     f"type=bind,source={source},target=/repo,readonly", GITLEAKS, "dir", "--redact", "--no-banner",
                     "--log-level", "error", "/repo"], hidden=True)
        pipeline.run("secrets-history", ["docker", "run", "--rm", "--network", "none", "--env", "GIT_CONFIG_COUNT=1",
                     "--env", "GIT_CONFIG_KEY_0=safe.directory", "--env", "GIT_CONFIG_VALUE_0=/repo", "--mount",
                     f"type=bind,source={ROOT},target=/repo,readonly", GITLEAKS, "git", "--redact", "--no-banner",
                     "--log-level", "error", "--log-opts=--all", "/repo"], hidden=True)
        for name, dockerfile, context in (
            ("test", "Backend/Dockerfile.test", "Backend"), ("api", "Backend/Dockerfile", "Backend"),
            ("ai", "Backend/ai_service/Dockerfile", "Backend"), ("frontend", "Frontend/Dockerfile.ci", "Frontend"),
            ("web", "Frontend/Dockerfile.production", "Frontend"),
        ):
            pipeline.run(f"build-{name}", ["docker", "build", "-f", dockerfile, "-t", images[name], context])
        pipeline.run("python-ruff", compose("test", "run", "--rm", "--no-deps", "backend_test", "python", "-m", "ruff", "check", "."))
        pipeline.run("python-bandit", backend("python", "-m", "bandit", "-r", "apps", "ai_service", "services", "config", "-x", "**/migrations/**", "-ll", "-q"))
        pipeline.run("python-package-consistency", backend("python", "-m", "pip", "check"))
        pipeline.run("postgres-ready", compose("test", "up", "-d", "--wait", "db_test"), timeout=180)
        pipeline.run("django-migrate", backend("python", "manage.py", "migrate", "--noinput"))
        pipeline.run("django-check", backend("python", "manage.py", "check"))
        pipeline.run("django-migration-drift", backend("python", "manage.py", "makemigrations", "--check", "--dry-run"))
        # Results are also persisted as JUnit; the tested snapshot is not mounted writable.
        pipeline.run("backend-tests", compose("test", "run", "--rm", "--no-deps", "-v", f"{output}:/artifacts",
                     "backend_test", "python", "-m", "pytest", "-c", "pytest.postgres.ini", "-q", "-p", "no:cacheprovider",
                     "--junitxml=/artifacts/backend-junit.xml"))
        pipeline.run("django-app-tests", backend("python", "manage.py", "test", "apps", "--noinput", "--verbosity", "1"))
        pipeline.run("ai-compile", backend("python", "-m", "compileall", "-q", "ai_service"))
        pipeline.run("ai-unit-tests", backend("python", "-m", "unittest", "discover", "-s", "ai_service/tests", "-p", "test_*.py", "-v"))
        for name in ("api", "ai"):
            pipeline.run(f"nonroot-{name}", ["docker", "run", "--rm", "--network", "none", "--entrypoint", "id", images[name], "-u"], expected="10001")
        pipeline.run("frontend-lint", frontend("lint", "npm", "run", "lint"))
        pipeline.run("frontend-tests", frontend("tests", "npm", "test", "--", "--reporter=json", "--outputFile=/artifacts/frontend-tests.json"))
        pipeline.run("frontend-build", frontend("build", "npm", "run", "build"))
        pipeline.run("python-audit", backend("python", "-m", "pip_audit", "-r", "requirements/ci.linux-py312.lock"))
        pipeline.run("frontend-audit", frontend("audit", "npm", "audit", "--audit-level=moderate", "--json", network="bridge"))
        # Syntax validates the production Caddyfile already embedded by the build.
        pipeline.run("caddy-config", ["docker", "run", "--rm", "--network", "none", "-e", "AELO_DOMAIN=example.test",
                     images["web"], "caddy", "validate", "--config", "/etc/caddy/Caddyfile"])
        # Development Compose config uses the committed example, never Backend/.env on the host.
        shutil.copyfile(source / "Backend/.env.example", source / "Backend/.env")
        pipeline.run("compose-development-config", ["docker", "compose", "--env-file", str(source / "Backend/.env.example"),
                     "-f", str(source / "Backend/docker-compose.yml"), "config", "--quiet"])
        pipeline.run("compose-tls-config", ["docker", "compose", "--env-file", str(source / "Backend/.env.example"),
                     "-f", str(source / "Backend/docker-compose.yml"), "-f", str(source / "Backend/docker-compose.tls.yml"), "config", "--quiet"])
        pipeline.run("http-stack", compose("http", "up", "-d", "--no-build", "api_security", "web_security"))
        pipeline.run("http-smoke", compose("http", "run", "--rm", "--no-deps", "security_smoke"))
        pipeline.run("http-load", compose("http", "run", "--rm", "--no-deps", "-e", "VUS=10", "-e", "DURATION=30s",
                     "load_security", "run", "--quiet", "/scripts/clinic_small.js"), timeout=180)
        pipeline.run("http-after-load", compose("http", "run", "--rm", "--no-deps", "security_smoke"))
        pipeline.run("tls-stack", compose("tls", "up", "-d", "--no-build", "api_tls", "web_tls"))
        pipeline.run("tls-smoke", compose("tls", "run", "--rm", "--no-deps", "tls_smoke"))
        pipeline.run("tls-deploy-check", compose("tls", "run", "--rm", "--no-deps", "migrate_tls", "python", "manage.py", "check", "--deploy", "--fail-level", "ERROR"))
        pipeline.run("image-identities", ["docker", "image", "inspect", *images.values(), "--format", "{{.Id}} {{json .RepoTags}}"])
        success = True
    except (StepFailed, ValueError, subprocess.SubprocessError) as error:
        metadata["failure"] = str(error)
    finally:
        for stack in reversed(projects):
            try:
                pipeline.run(f"cleanup-{stack}", compose(stack, "down", "--volumes", "--remove-orphans"), timeout=180)
            except StepFailed:
                success = False
        # Named standalone containers might survive a timeout/disconnected Docker client.
        for name in containers:
            try:
                subprocess.run(["docker", "rm", "-f", name], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
            except (OSError, subprocess.SubprocessError):
                success = False
                metadata["standalone_cleanup_error"] = True
        metadata["finished_utc"] = datetime.now(UTC).isoformat()
        pipeline.finish(success, metadata)
    print(f"{'PASSED' if success else 'FAILED'}: {output / 'manifest.json'}", flush=True)
    return 0 if success else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="HEAD", help="Committed Git ref to validate (default HEAD)")
    parser.add_argument("--output", default="reports/local-ci", help="Report directory within this repository")
    parser.add_argument("--verify", type=Path, help="Verify hashes and success status of an existing report")
    args = parser.parse_args(argv)
    try:
        if args.verify:
            print(f"VERIFIED: {verify_report(args.verify)}")
            return 0
        return run_pipeline(args.ref, args.output)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"LOCAL_CI_ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
