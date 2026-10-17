"""Unit tests requiring no running Ollama or clinical records."""
import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from ai_service.main import AnalysisRequest, ContextItem, analysis, AnalysisResult, require_service_token


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


class ServiceAuthenticationTests(unittest.TestCase):
    def test_missing_token_rejected(self):
        with patch.dict("os.environ", {"AI_SERVICE_TOKEN": "local-test-only-strong-service-secret"}):
            with self.assertRaises(HTTPException) as ctx:
                require_service_token(None)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_valid_service_token_accepted(self):
        with patch.dict("os.environ", {"AI_SERVICE_TOKEN": "local-test-only-strong-service-secret"}):
            self.assertIsNone(require_service_token("local-test-only-strong-service-secret"))

    def test_unconfigured_service_token_is_rejected(self):
        with patch.dict("os.environ", {"AI_SERVICE_TOKEN": ""}):
            with self.assertRaises(HTTPException):
                require_service_token("something")

class EvidenceValidationTests(unittest.TestCase):
    def test_citation_excerpt_must_match_authorized_note(self):
        from ai_service.main import ollama_analysis
        import httpx
        import json
        valid = {
            "patterns": ["Relato sintético"], "longitudinal_evolution": "",
            "attention_points": [], "sources": [
                {"note_id": "synthetic-note", "session_id": None, "excerpt": "trecho inventado", "relevance_score": 0.5}
            ], "relevance_score": 0.5,
        }
        response = httpx.Response(200, json={"response": json.dumps(valid)}, request=httpx.Request("POST", "http://ollama.test/api/generate"))
        with patch("ai_service.main.httpx.AsyncClient") as client:
            client.return_value.__aenter__.return_value.post = AsyncMock(return_value=response)
            with self.assertRaises(ValueError):
                asyncio.run(ollama_analysis(fake_payload()))

    def test_narrative_without_citations_is_rejected(self):
        from ai_service.main import ollama_analysis
        import httpx
        import json
        uncited = {"patterns": ["Inferência sem origem"], "longitudinal_evolution": "",
                   "attention_points": [], "sources": [], "relevance_score": 0.1}
        response = httpx.Response(200, json={"response": json.dumps(uncited)}, request=httpx.Request("POST", "http://ollama.test/api/generate"))
        with patch("ai_service.main.httpx.AsyncClient") as client:
            client.return_value.__aenter__.return_value.post = AsyncMock(return_value=response)
            with self.assertRaises(ValueError):
                asyncio.run(ollama_analysis(fake_payload()))
