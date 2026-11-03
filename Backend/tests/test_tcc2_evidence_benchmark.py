"""Synthetic benchmark regression checks, independent of Django or Ollama."""

import copy

import pytest

from services.metrics.evidence_benchmark import evaluate_evidence


@pytest.fixture
def sample():
    return {
        "schema_version": 1,
        "declared_data_classification": "synthetic",
        "notes": [
            {"id": "n1", "patient_id": "p1", "version": 2,
             "text": "Pessoa fictícia relata sono irregular após alteração de rotina."},
            {"id": "n2", "patient_id": "p1", "version": 1,
             "text": "Pessoa fictícia relata melhoria da rotina de descanso."},
            {"id": "n3", "patient_id": "p2", "version": 1,
             "text": "Outro caso fictício faz uma atividade de lazer."},
        ],
        "cases": [{
            "id": "case1", "patient_id": "p1",
            "gold_note_ids": ["n1", "n2"], "retrieved_note_ids": ["n2", "n1"],
            "claims": [
                {"source": {"note_id": "n1", "version": 2, "excerpt": "sono irregular"}},
                {"source": {"note_id": "n2", "version": 1, "excerpt": "melhoria da rotina"}},
            ],
        }],
    }


def test_correct_literal_links_and_retrieval(sample):
    result = evaluate_evidence(sample)
    assert result["metrics"]["retrieval_recall_at_k"] == 1
    assert result["metrics"]["literal_citation_validity_rate"] == 1
    assert result["counts"]["foreign_citations"] == 0
    assert "semantic faithfulness" in result["warning"]


def test_cross_patient_reference_is_violation(sample):
    sample["cases"][0]["retrieved_note_ids"] = ["n3", "n1"]
    sample["cases"][0]["claims"][0]["source"] = {
        "note_id": "n3", "version": 1, "excerpt": "atividade de lazer"
    }
    result = evaluate_evidence(sample)
    assert result["counts"]["foreign_retrievals_at_k"] == 1
    assert result["counts"]["foreign_citations"] == 1
    assert result["counts"]["invalid_citations"] == 1
    assert result["metrics"]["retrieval_recall_at_k"] == 0.5


@pytest.mark.parametrize("source", [
    {"note_id": "n1", "version": 1, "excerpt": "sono irregular"},
    {"note_id": "n1", "version": 2, "excerpt": "invenção não documentada"},
    {"note_id": "desconhecida", "version": 2, "excerpt": "sono irregular"},
    None,
])
def test_stale_invented_unknown_or_missing_citation(sample, source):
    sample["cases"][0]["claims"][0]["source"] = source
    result = evaluate_evidence(sample)
    assert result["counts"]["invalid_citations"] == 1
    assert result["metrics"]["literal_citation_validity_rate"] == 0.5


def test_gold_cannot_contain_foreign_note(sample):
    sample["cases"][0]["gold_note_ids"] = ["n1", "n3"]
    with pytest.raises(ValueError, match="Gold notes"):
        evaluate_evidence(sample)


def test_duplicate_note_ids_are_rejected(sample):
    sample["notes"].append(copy.deepcopy(sample["notes"][0]))
    with pytest.raises(ValueError, match="duplicate"):
        evaluate_evidence(sample)


def test_empty_gold_and_claims_have_no_invented_scores(sample):
    sample["cases"][0]["gold_note_ids"] = []
    sample["cases"][0]["claims"] = []
    result = evaluate_evidence(sample)
    assert result["metrics"]["retrieval_recall_at_k"] is None
    assert result["metrics"]["literal_citation_validity_rate"] is None


def test_invalid_k_fails(sample):
    with pytest.raises(ValueError, match="positive integer"):
        evaluate_evidence(sample, k=0)


def test_missing_classification_is_rejected(sample):
    del sample["declared_data_classification"]
    with pytest.raises(ValueError, match="Synthetic-only"):
        evaluate_evidence(sample)
