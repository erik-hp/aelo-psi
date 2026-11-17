"""Fail when a requirements declaration or generated lock differs from its manifest."""

import hashlib
import json
from pathlib import Path


def verify(directory):
    directory = Path(directory)
    data = json.loads((directory / "locks.json").read_text(encoding="utf-8"))
    expected = {"inputs": {"base.txt", "ai.txt", "dev.txt", "ci.in"},
                "locks": {f"{scope}.linux-py312.lock" for scope in ("base", "ai", "ci")}}
    if data["platform"] != "linux" or data["python"] != "3.12":
        raise ValueError("Unsupported lock target")
    for group, names in expected.items():
        if set(data[group]) != names:
            raise ValueError("Incomplete lock manifest")
        for name in names:
            if hashlib.sha256((directory / name).read_bytes()).hexdigest() != data[group][name]:
                raise ValueError(f"Requirements changed; regenerate locks: {name}")


if __name__ == "__main__":
    verify(Path(__file__).resolve().parents[1] / "requirements")
    print("REQUIREMENTS_LOCKS_OK")
