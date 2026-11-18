"""Reproducible SUS (Brooke, 1996) and UMUX-Lite (Lewis et al., 2013) calculators (F6-03 / VAL-02).

Methodological invariants:
- SUS (10 items, Likert 1..5) and UMUX-Lite (2 items, Likert 1..7) are computed and reported separately.
- Never treat UMUX-Lite as a drop-in replacement for SUS; regression adjustment is reported distinctly from raw UMUX-Lite.
- Input batches must explicitly declare provenance (`synthetic_validation` vs `approved_cep_collection` with protocol ID).
"""
import argparse
import json
import math
from pathlib import Path
from statistics import mean, median, pstdev


def score_sus(items: list[int]) -> float:
    """Compute System Usability Scale score (0..100) from 10 Likert responses in 1..5."""
    if not isinstance(items, list) or len(items) != 10:
        raise ValueError("SUS requires exactly 10 integer responses.")
    total = 0
    for idx, value in enumerate(items, start=1):
        if type(value) is not int or not (1 <= value <= 5):
            raise ValueError(f"SUS item {idx} must be an integer in 1..5.")
        total += (value - 1) if idx % 2 == 1 else (5 - value)
    return round(total * 2.5, 2)


def score_umux_lite(items: list[int]) -> dict[str, float]:
    """Compute raw UMUX-Lite (0..100) and Lewis et al. (2013) SUS-correspondence estimate separately from 2 responses in 1..7."""
    if not isinstance(items, list) or len(items) != 2:
        raise ValueError("UMUX-Lite requires exactly 2 integer responses.")
    for idx, value in enumerate(items, start=1):
        if type(value) is not int or not (1 <= value <= 7):
            raise ValueError(f"UMUX-Lite item {idx} must be an integer in 1..7.")
    raw = ((items[0] - 1) + (items[1] - 1)) * (100.0 / 12.0)
    correspondence = 0.65 * raw + 22.9
    return {
        "raw_score": round(raw, 2),
        "sus_correspondence_estimate": round(correspondence, 2),
    }


def _summary_stats(values: list[float]) -> dict[str, float | int]:
    if not values:
        raise ValueError("Cannot summarize an empty score list.")
    ordered = sorted(values)
    n = len(ordered)
    q1 = ordered[max(0, math.floor((n - 1) * 0.25))]
    q3 = ordered[min(n - 1, math.ceil((n - 1) * 0.75))]
    return {
        "n": n,
        "mean": round(mean(ordered), 2),
        "median": round(median(ordered), 2),
        "iqr": round(q3 - q1, 2),
        "std_pop": round(pstdev(ordered), 2) if n > 1 else 0.0,
        "min": round(ordered[0], 2),
        "max": round(ordered[-1], 2),
    }


def evaluate_batch(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object.")
    kind = payload.get("dataset_kind")
    if kind not in {"synthetic_validation", "approved_cep_collection"}:
        raise ValueError("dataset_kind must be 'synthetic_validation' or 'approved_cep_collection'.")
    if kind == "approved_cep_collection":
        cep_ref = str(payload.get("cep_protocol_reference", "")).strip()
        if len(cep_ref) < 5:
            raise ValueError("Real participant collection requires a non-empty cep_protocol_reference.")
    responses = payload.get("responses")
    if not isinstance(responses, list) or not responses:
        raise ValueError("responses must be a non-empty list.")

    sus_scores: list[float] = []
    umux_raw_scores: list[float] = []
    umux_corr_scores: list[float] = []
    seen_ids: set[str] = set()

    for entry in responses:
        if not isinstance(entry, dict):
            raise ValueError("Each response entry must be an object.")
        pid = str(entry.get("participant_code", "")).strip()
        if not pid or pid in seen_ids:
            raise ValueError("Each response requires a unique pseudonymous participant_code.")
        seen_ids.add(pid)
        if "sus" in entry and entry["sus"] is not None:
            sus_scores.append(score_sus(entry["sus"]))
        if "umux_lite" in entry and entry["umux_lite"] is not None:
            umux = score_umux_lite(entry["umux_lite"])
            umux_raw_scores.append(umux["raw_score"])
            umux_corr_scores.append(umux["sus_correspondence_estimate"])

    if not sus_scores and not umux_raw_scores:
        raise ValueError("At least one SUS or UMUX-Lite response set is required.")

    report: dict = {
        "dataset_kind": kind,
        "is_empirical_human_result": kind == "approved_cep_collection",
        "participant_count": len(seen_ids),
    }
    if sus_scores:
        report["sus"] = _summary_stats(sus_scores)
    if umux_raw_scores:
        report["umux_lite_raw"] = _summary_stats(umux_raw_scores)
        report["umux_lite_sus_correspondence"] = _summary_stats(umux_corr_scores)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="JSON file containing usability responses.")
    args = parser.parse_args(argv)
    data = json.loads(args.input.read_text(encoding="utf-8"))
    summary = evaluate_batch(data)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
