"""Exercise the real pgvector operator when PostgreSQL is available."""

import pytest
from django.db import connection
from django.utils import timezone
from pgvector.django import CosineDistance

from apps.ai_analysis.models import VaultNode


@pytest.mark.django_db
def test_patient_scoped_cosine_search_on_pgvector(records):
    if connection.vendor != "postgresql":
        pytest.skip("pgvector search requires PostgreSQL")

    now = timezone.now()
    patient = records["patient"]
    other_patient = records["other_patient"]
    for target, fingerprint, embedding in (
        (patient, "a" * 64, [1.0, 0.0]),
        (patient, "b" * 64, [0.0, 1.0]),
        (other_patient, "c" * 64, [1.0, 0.0]),
    ):
        VaultNode.objects.create(
            patient=target, fingerprint=fingerprint, kind="context",
            label="conceito de teste", embedding=embedding,
            first_seen_at=now, last_seen_at=now,
        )

    matches = list(
        VaultNode.objects.filter(patient=patient)
        .annotate(distance=CosineDistance("embedding", [1.0, 0.0]))
        .order_by("distance")
        .values_list("fingerprint", "distance")
    )
    assert [fingerprint for fingerprint, _ in matches] == ["a" * 64, "b" * 64]
    assert matches[0][1] == pytest.approx(0)
    assert matches[1][1] == pytest.approx(1)
