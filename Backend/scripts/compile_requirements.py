"""Regenerate hashed Linux/Python 3.12 dependency locks using pip-tools 7.6.2."""

import platform
import hashlib
import json
import subprocess
import sys
from pathlib import Path


def record_metadata():
    if sys.version_info[:2] != (3, 12) or platform.system() != "Linux":
        raise SystemExit("Record lock provenance inside Linux/Python 3.12.")
    directory = Path("requirements")
    inputs = ["base.txt", "ai.txt", "dev.txt", "ci.in"]
    locks = [f"{scope}.linux-py312.lock" for scope in ("base", "ai", "ci")]
    data = {"platform": "linux", "python": "3.12", "compiler": "pip-tools==7.6.2"}
    for key, names in (("inputs", inputs), ("locks", locks)):
        data[key] = {name: hashlib.sha256((directory / name).read_bytes()).hexdigest() for name in names}
    (directory / "locks.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main():
    if sys.version_info[:2] != (3, 12) or platform.system() != "Linux":
        raise SystemExit("Generate these locks inside a Linux/Python 3.12 container.")
    for scope, source in (("base", "base.txt"), ("ai", "ai.txt"), ("ci", "ci.in")):
        print(f"Compiling {scope} dependencies with hashes", flush=True)
        subprocess.run([
            sys.executable, "-m", "piptools", "compile", "--generate-hashes", "--strip-extras", "--allow-unsafe",
            "--no-emit-index-url", "--no-emit-trusted-host", "--quiet",
            "--output-file", str(Path("requirements") / f"{scope}.linux-py312.lock"),
            str(Path("requirements") / source),
        ], check=True)
    record_metadata()


if __name__ == "__main__":
    main()
