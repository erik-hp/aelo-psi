"""Create 100/200-node synthetic Vault graphs for isolated load tests."""

import os

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.ai_analysis.models import VaultEdge, VaultNode
from apps.ai_analysis.vault_core.algorithms import fingerprint
from apps.clinical_notes.models import ClinicalNote
from apps.patients.models import Patient


class Command(BaseCommand):
    help = "Seed synthetic 100/200-node graphs in the isolated security stack only."

    def handle(self, *args, **options):
        if os.getenv("AELO_SECURITY_SCENARIO") != "1":
            raise CommandError("Synthetic graph seed is restricted to the isolated security stack.")
        for patient in Patient.objects.filter(internal_code__startswith="S-").select_related("created_by"):
            target = 100 if int(patient.internal_code.split("-")[-1]) % 2 else 200
            if VaultNode.objects.filter(patient=patient).exists():
                continue
            note = ClinicalNote.objects.create(
                patient=patient, author=patient.created_by,
                raw_text="Synthetic graph evidence only.", anonymized_text="Synthetic graph evidence only.",
            )
            now = timezone.now()
            nodes = [
                VaultNode(
                    patient=patient, fingerprint=fingerprint(patient.pk, "context", f"Synthetic Node {index}"),
                    kind="context", label=f"Synthetic Node {index}", first_seen_at=now, last_seen_at=now,
                ) for index in range(target)
            ]
            VaultNode.objects.bulk_create(nodes)
            VaultEdge.objects.bulk_create([
                VaultEdge(
                    patient=patient, source=nodes[index], target=nodes[(index + 1) % target],
                    note=note, relation="associated", evidence="Synthetic graph evidence only.",
                    observed_at=now, confidence="0.700", weight="0.700",
                ) for index in range(target)
            ])
        self.stdout.write(self.style.SUCCESS("Synthetic 100/200-node graphs ready."))
