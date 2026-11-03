import re


class UnsafeClinicalText(ValueError):
    """A clinical note still contains a recognizable identifier after redaction."""


RESIDUAL_PATTERNS = {
    "EMAIL": r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b",
    "CPF": r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b",
    "CNPJ": r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b",
    "RG": r"\bRG\s*:?\s*[\d.\-Xx]{7,}\b",
    "PHONE": r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b",
    "URL": r"https?://[^\s<>]+",
    "ADDRESS": r"\b(?:Rua|Avenida|Av\.|Travessa|Alameda)\s+[\wÀ-ÿ][\wÀ-ÿ\s.]{2,60},?\s*\d{1,5}\b",
    "NAMED_PERSON": r"\b(?:nome\s*[:=]|(?:mãe|pai|filh[oa]|cônjuge)\s+(?:de\s+)?)(?:[A-ZÀ-Ý][a-zà-ÿ]+\s+){1,3}[A-ZÀ-Ý][a-zà-ÿ]+\b",
}


def residual_identifier_codes(text: str) -> list[str]:
    """Return categories only; never include clinical fragments in telemetry."""
    return [code for code, pattern in RESIDUAL_PATTERNS.items() if re.search(pattern, text or "", re.IGNORECASE if code == "ADDRESS" else 0)]


def prepare_ai_text(text: str, display_name: str | None = None, internal_code: str | None = None) -> str:
    redacted = anonymize_text(text, display_name, internal_code)
    if residual_identifier_codes(redacted):
        raise UnsafeClinicalText("Clinical text requires manual redaction before AI processing.")
    return redacted


def anonymize_text(text: str, display_name: str | None = None, internal_code: str | None = None) -> str:
    value = text or ""
    replacements = [
        (r"https?://[^\s<>]+", "[URL]"),
        (r"\b[\w\.-]+@[\w\.-]+\.\w+\b", "[EMAIL]"),
        (r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b", "[CNPJ]"),
        (r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b", "[CPF]"),
        (r"\bRG\s*:?\s*\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]\b", "[RG]"),
        (r"\b\d{5}-?\d{3}\b", "[CEP]"),
        (r"\b(?:0?[1-9]|[12]\d|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}\b", "[DATE]"),
        (r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b", "[PHONE]"),
    ]
    if display_name:
        replacements.append((re.escape(display_name), "[PATIENT]"))
    if internal_code:
        replacements.append((re.escape(internal_code), "[PATIENT_CODE]"))
    for pattern, repl in replacements:
        value = re.sub(pattern, repl, value, flags=re.IGNORECASE)
    return value
