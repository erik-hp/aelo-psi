"""AES-256-GCM encryption for clinical text stored in the database."""

import base64
import binascii
import json
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models


PREFIX = "enc:v2:"


def _keys() -> list[bytes]:
    keys = getattr(settings, "CLINICAL_DATA_KEYS", [])
    if not keys:
        raise ImproperlyConfigured("CLINICAL_DATA_KEYS must contain at least one base64 encoded 256-bit key.")
    try:
        decoded = [base64.b64decode(key.encode("ascii"), altchars=b"-_", validate=True) for key in keys]
    except (ValueError, TypeError, UnicodeEncodeError, binascii.Error) as exc:
        raise ImproperlyConfigured("CLINICAL_DATA_KEYS contains an invalid base64 key.") from exc
    if any(len(key) != 32 for key in decoded):
        raise ImproperlyConfigured("Every CLINICAL_DATA_KEYS key must decode to exactly 32 bytes.")
    return decoded


def encrypt_text(value: str, context: str = "") -> str:
    if not value:
        return value
    if value.startswith(PREFIX):
        raise ValueError("Refusing to encrypt an already encrypted value.")
    nonce = os.urandom(12)
    encrypted = AESGCM(_keys()[0]).encrypt(nonce, value.encode("utf-8"), context.encode("utf-8"))
    return PREFIX + base64.urlsafe_b64encode(nonce + encrypted).decode("ascii")


def decrypt_text(value: str, context: str = "") -> str:
    if not value:
        return value
    if not value.startswith(PREFIX):
        raise ValueError("Clinical text is not encrypted; check the migration state.")
    try:
        payload = base64.b64decode(value[len(PREFIX):].encode("ascii"), altchars=b"-_", validate=True)
    except (ValueError, UnicodeEncodeError, binascii.Error) as exc:
        raise ValueError("Clinical text has invalid ciphertext encoding.") from exc
    if len(payload) < 29:
        raise ValueError("Clinical text ciphertext is too short.")
    for key in _keys():
        try:
            return AESGCM(key).decrypt(payload[:12], payload[12:], context.encode("utf-8")).decode("utf-8")
        except InvalidTag:
            continue
    raise ValueError("Clinical text authentication failed; check the data key and record integrity.")


class EncryptedTextField(models.TextField):
    """Encrypt on write and authenticate/decrypt on read; do not query by value."""

    def from_db_value(self, value, expression, connection):
        return decrypt_text(value, self._context()) if value is not None else None

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        return encrypt_text(value, self._context()) if value is not None else None

    def _context(self) -> str:
        return f"{self.model._meta.label_lower}.{self.name}"


class EncryptedJSONField(models.JSONField):
    """Keep JSONB storage while storing only an encrypted JSON string in it."""

    def get_prep_value(self, value):
        if value is None:
            return None
        serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        return encrypt_text(serialized, f"{self.model._meta.label_lower}.{self.name}")

    def from_db_value(self, value, expression, connection):
        decoded = super().from_db_value(value, expression, connection)
        if decoded is None:
            return None
        if not isinstance(decoded, str):
            raise ValueError("Clinical JSON is not encrypted; check the migration state.")
        return json.loads(decrypt_text(decoded, f"{self.model._meta.label_lower}.{self.name}"))
