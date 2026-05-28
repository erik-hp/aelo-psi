import requests
from django.conf import settings


class AIServiceError(RuntimeError):
    pass


class AIClient:
    def request_analysis(self, payload: dict) -> dict:
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}/analysis"
        try:
            response = requests.post(url, json=payload, timeout=settings.AI_SERVICE_TIMEOUT)
            response.raise_for_status()
        except requests.RequestException as exc:
            raise AIServiceError(str(exc)) from exc
        return response.json()
