import requests
from django.conf import settings


class AIServiceError(RuntimeError):
    pass


class AIClient:
    def request_analysis(self, payload: dict) -> dict:
        token = settings.AI_SERVICE_TOKEN
        if not token or token.startswith("CHANGE_ME"):
            raise AIServiceError("AI service authentication is not configured.")
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}/analysis"
        try:
            response = requests.post(
                url,
                json=payload,
                headers={"X-Aelo-Service-Token": token},
                timeout=settings.AI_SERVICE_TIMEOUT,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise AIServiceError("AI service is unavailable or rejected the request.") from exc
        return response.json()
