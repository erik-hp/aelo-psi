import base64
from io import StringIO

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.audit_logs.integrity import verify_audit_chain
from apps.users.models import UserSigningKey


@pytest.mark.django_db
def test_signing_key_reset_requires_explicit_apply_and_is_audited(records):
    client = APIClient()
    client.force_authenticate(user=records["owner"])
    public_der = ec.generate_private_key(ec.SECP256R1()).public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    assert client.post("/api/users/me/signing-key/", {"public_key_spki": base64.b64encode(public_der).decode()}).status_code == 201

    call_command("reset_signing_key", "owner", stdout=StringIO())
    assert UserSigningKey.objects.filter(user=records["owner"]).exists()
    call_command("reset_signing_key", "owner", "--apply", stdout=StringIO())
    assert not UserSigningKey.objects.filter(user=records["owner"]).exists()
    assert verify_audit_chain()[0]
