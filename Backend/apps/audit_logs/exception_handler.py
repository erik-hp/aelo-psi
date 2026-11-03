"""Record authorization failures without storing path, query or clinical text."""
from rest_framework import exceptions, status
from rest_framework.views import exception_handler
from .services import audit


def audited_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get("request")
    if request and isinstance(exc, (exceptions.PermissionDenied, exceptions.NotAuthenticated)):
        view = context.get("view")
        audit(
            request,
            "ACCESS_DENIED",
            view if view is not None else exc,
            {
                "module": "authorization",
                "method": request.method,
                "status_code": response.status_code if response else status.HTTP_403_FORBIDDEN,
            },
        )
    return response
