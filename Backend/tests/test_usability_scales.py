"""F6-03 / VAL-02: Reproducible SUS and UMUX-Lite calculation and provenance checks."""
import json
from pathlib import Path
import subprocess
import sys

import pytest

from services.metrics.usability_scales import evaluate_batch, score_sus, score_umux_lite

BACKEND = Path(__file__).resolve().parents[1]


def test_sus_exact_literature_boundaries():
    assert score_sus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]) == 100.0
    assert score_sus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]) == 0.0
    assert score_sus([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]) == 50.0


@pytest.mark.parametrize("bad_items", [[5] * 9, [5] * 11, [0, 1, 5, 1, 5, 1, 5, 1, 5, 1], [True, 1, 5, 1, 5, 1, 5, 1, 5, 1]])
def test_sus_rejects_malformed_inputs(bad_items):
    with pytest.raises(ValueError):
        score_sus(bad_items)


def test_umux_lite_reports_raw_and_correspondence_separately():
    top = score_umux_lite([7, 7])
    assert top["raw_score"] == 100.0
    assert top["sus_correspondence_estimate"] == 87.9

    bottom = score_umux_lite([1, 1])
    assert bottom["raw_score"] == 0.0
    assert bottom["sus_correspondence_estimate"] == 22.9


@pytest.mark.parametrize("bad_items", [[7], [7, 7, 7], [0, 7], [7, 8], [True, 7]])
def test_umux_lite_rejects_malformed_inputs(bad_items):
    with pytest.raises(ValueError):
        score_umux_lite(bad_items)


def test_real_collection_requires_cep_protocol_reference():
    with pytest.raises(ValueError):
        evaluate_batch({
            "dataset_kind": "approved_cep_collection",
            "responses": [{"participant_code": "P1", "sus": [4, 2, 4, 2, 4, 2, 4, 2, 4, 2]}],
        })


def test_cli_evaluates_synthetic_fixture():
    fixture = BACKEND / "tests/fixtures/tcc2_usability_synthetic.json"
    proc = subprocess.run(
        [sys.executable, "services/metrics/usability_scales.py", "--input", str(fixture)],
        cwd=BACKEND,
        capture_output=True,
        text=True,
        check=True,
    )
    report = json.loads(proc.stdout)
    assert report["dataset_kind"] == "synthetic_validation"
    assert report["is_empirical_human_result"] is False
    assert report["participant_count"] == 3
    assert report["sus"]["median"] == 75.0
    assert "umux_lite_raw" in report
    assert "umux_lite_sus_correspondence" in report
