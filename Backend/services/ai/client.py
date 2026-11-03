import requests
from django.conf import settings
from rest_framework.exceptions import APIException


class AIServiceError(APIException):
    status_code = 503
    default_detail = "Assistive analysis is temporarily unavailable."


class AIClient:
    def request_vault(self, payload: dict) -> dict:
        return self._post("/vault/extract", payload)

    def request_vault_synthesis(self, payload: dict) -> dict:
        return self._post("/vault/synthesize", payload)

    def request_analysis(self, payload: dict) -> dict:
        return self._post("/analysis", payload)

    def _post(self, path: str, payload: dict) -> dict:
        if not settings.AI_SERVICE_TOKEN:
            raise AIServiceError()
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}{path}"
        try:
            response = requests.post(
                url,
                json=payload,
                headers={"X-AI-Service-Token": settings.AI_SERVICE_TOKEN},
                timeout=settings.AI_SERVICE_TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise ValueError("AI service returned a non-object response.")
            return data
        except (requests.RequestException, ValueError) as exc:
            raise AIServiceError() from exc
