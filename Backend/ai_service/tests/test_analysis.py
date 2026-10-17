"""Unit tests requiring no running Ollama or clinical records."""
import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from ai_service.main import AnalysisRequest, ContextItem, analysis, AnalysisResult


def fake_payload():
    return AnalysisRequest(patient_id="synthetic-patient", context=[
        ContextItem(note_id="synthetic-note", created_at="2026-01-01T00:00:00", text="Relato fictício")
    ])


class AnalysisFailureTests(unittest.TestCase):
    def test_outage_is_failure_not_fabricated_result(self):
        with patch("ai_service.main.ollama_analysis", new_callable=AsyncMock, side_effect=ValueError("not valid")):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(analysis(fake_payload()))
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertNotIn("not valid", str(ctx.exception.detail))

    def test_empty_context_is_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(analysis(AnalysisRequest(patient_id="synthetic-patient")))
        self.assertEqual(ctx.exception.status_code, 422)

    def test_result_schema_rejects_invalid_scores(self):
        with self.assertRaises(ValueError):
            AnalysisResult(patterns=[], longitudinal_evolution="", attention_points=[],
                           sources=[], relevance_score=12)
