from services.security.anonymization import anonymize_text


def test_common_brazilian_identifiers_are_redacted_before_ai():
    raw = (
        "Maria Silva P-01 CPF 123.456.789-00 CNPJ 12.345.678/0001-90 "
        "RG 12.345.678-9 CEP 63900-000 em 02/11/2026. "
        "Contato maria@example.com, (85) 99999-9999, https://example.com/perfil"
    )
    result = anonymize_text(raw, display_name="Maria Silva", internal_code="P-01")
    for secret in ("Maria Silva", "P-01", "123.456.789-00", "12.345.678/0001-90", "12.345.678-9", "63900-000", "02/11/2026", "maria@example.com", "99999-9999", "example.com/perfil"):
        assert secret not in result
    assert "[PATIENT]" in result
    assert "[CPF]" in result
