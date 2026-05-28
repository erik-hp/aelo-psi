from django.db import models
from services.security.models import SoftDeleteModel


class Clinic(SoftDeleteModel):
    name = models.CharField(max_length=180)
    document = models.CharField(max_length=32, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=["name"]), models.Index(fields=["is_active"])]

    def __str__(self) -> str:
        return self.name
