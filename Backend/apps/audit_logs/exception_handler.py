from rest_framework import exceptions, status
from rest_framework.views import exception_handler
from .models import AuditLog
from .services import get_client_ip


def audited_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get("request")
    if request and isinstance(exc, (exceptions.PermissionDenied, exceptions.NotAuthenticated)):
        user = getattr(request, "user", None)
        AuditLog.objects.create(
            user=user if getattr(user, "is_authenticated", False) else None,
            action="ACCESS_DENIED",
            entity=context.get("view").__class__.__name__ if context.get("view") else "UnknownView",
            entity_id="",
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            metadata={"path": request.path, "method": request.method, "status_code": response.status_code if response else status.HTTP_403_FORBIDDEN},
        )
    return response
