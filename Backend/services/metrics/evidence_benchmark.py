"""Reproducible, synthetic-only checks of evidence links and retrieval.

This module measures literal citation *verifiability*, not clinical accuracy,
semantic faithfulness, model safety or compliance with data protection law.
Input must contain synthetic records only. No clinical text is emitted in reports.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def _ratio(numerator: int, denominator: int) -> float | None:
    return round(numerator / denominator, 6) if denominator else None


def _unique_strings(values: Any, field: str) -> list[str]:
    if not isinstance(values, list) or any(not isinstance(v, str) or not v for v in values):
        raise ValueError(f"{field} must be a list of non-empty strings")
    if len(values) != len(set(values)):
        raise ValueError(f"{field} contains duplicate identifiers")
    return values


def evaluate_evidence(dataset: dict[str, Any], *, k: int = 5) -> dict[str, Any]:
    """Evaluate a declared retrieval/citation result against synthetic gold notes.

    Gold note IDs are validated for patient isolation. Cross-patient references
    in predictions count as violations, never as evidence hits.
    """
    if not isinstance(k, int) or isinstance(k, bool) or k < 1:
        raise ValueError("k must be a positive integer")
    if not isinstance(dataset, dict) or dataset.get("schema_version") != 1:
        raise ValueError("Unsupported benchmark schema_version; expected 1")
    rows = dataset.get("notes")
    cases = dataset.get("cases")
    if not isinstance(rows, list) or not isinstance(cases, list) or not cases:
        raise ValueError("notes and a nonempty cases array are required")

    notes: dict[str, dict[str, Any]] = {}
    for note in rows:
        if not isinstance(note, dict):
            raise ValueError("Each note must be an object")
        note_id, patient_id, version, body = (
            note.get("id"), note.get("patient_id"), note.get("version"), note.get("text")
        )
        if (not isinstance(note_id, str) or not note_id or note_id in notes
                or not isinstance(patient_id, str) or not patient_id
                or not isinstance(version, int) or isinstance(version, bool) or version < 1
                or not isinstance(body, str)):
            raise ValueError("Invalid or duplicate note id, owner, version or text")
        notes[note_id] = note

    totals = {
        "cases": 0, "gold_notes": 0, "retrieval_hits_at_k": 0,
        "retrieved_references_at_k": 0, "foreign_retrievals_at_k": 0,
        "unknown_retrievals_at_k": 0, "claims": 0,
        "literal_citations_valid": 0, "invalid_citations": 0,
        "foreign_citations": 0,
    }
    seen_cases: set[str] = set()
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError("Each case must be an object")
        case_id, patient_id = case.get("id"), case.get("patient_id")
        if (not isinstance(case_id, str) or not case_id or case_id in seen_cases
                or not isinstance(patient_id, str) or not patient_id):
            raise ValueError("Invalid/duplicate case id or patient id")
        seen_cases.add(case_id)
        gold = _unique_strings(case.get("gold_note_ids"), "gold_note_ids")
        retrieved = _unique_strings(case.get("retrieved_note_ids"), "retrieved_note_ids")
        claims = case.get("claims")
        if not isinstance(claims, list):
            raise ValueError("claims must be a list")
        for note_id in gold:
            if note_id not in notes or notes[note_id]["patient_id"] != patient_id:
                raise ValueError("Gold notes must exist and belong to the case patient")

        top_k = retrieved[:k]
        totals["cases"] += 1
        totals["gold_notes"] += len(gold)
        totals["retrieval_hits_at_k"] += len(set(gold).intersection(top_k))
        totals["retrieved_references_at_k"] += len(top_k)
        for note_id in top_k:
            if note_id not in notes:
                totals["unknown_retrievals_at_k"] += 1
            elif notes[note_id]["patient_id"] != patient_id:
                totals["foreign_retrievals_at_k"] += 1

        for claim in claims:
            totals["claims"] += 1
            valid = False
            if isinstance(claim, dict):
                source = claim.get("source")
                if isinstance(source, dict):
                    note_id, version, excerpt = (
                        source.get("note_id"), source.get("version"), source.get("excerpt")
                    )
                    candidate = notes.get(note_id) if isinstance(note_id, str) else None
                    if candidate is not None and candidate["patient_id"] != patient_id:
                        totals["foreign_citations"] += 1
                    valid = bool(
                        candidate is not None and candidate["patient_id"] == patient_id
                        and isinstance(version, int) and not isinstance(version, bool)
                        and version == candidate["version"]
                        and isinstance(excerpt, str) and bool(excerpt.strip())
                        and excerpt in candidate["text"]
                    )
            totals["literal_citations_valid" if valid else "invalid_citations"] += 1

    return {
        "schema_version": 1,
        "dataset_kind": "synthetic",
        "k": k,
        "counts": totals,
        "metrics": {
            "retrieval_recall_at_k": _ratio(totals["retrieval_hits_at_k"], totals["gold_notes"]),
            "literal_citation_validity_rate": _ratio(totals["literal_citations_valid"], totals["claims"]),
        },
        "warning": (
            "Only literal evidence presence, note ownership and source version are checked. "
            "This does not measure semantic faithfulness, clinical correctness or LGPD compliance."
        ),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Synthetic AELO evidence benchmark")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--strict", action="store_true", help="Fail if any invalid or foreign reference is observed")
    args = parser.parse_args(argv)
    data = json.loads(args.input.read_text(encoding="utf-8"))
    result = evaluate_evidence(data, k=args.k)
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    counts = result["counts"]
    if args.strict and any(counts[key] for key in (
        "foreign_retrievals_at_k", "unknown_retrievals_at_k", "invalid_citations"
    )):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
