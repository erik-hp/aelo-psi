import re


def anonymize_text(text: str, display_name: str | None = None, internal_code: str | None = None) -> str:
    value = text or ""
    replacements = [
        (r"\b[\w\.-]+@[\w\.-]+\.\w+\b", "[EMAIL]"),
        (r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b", "[CPF]"),
        (r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b", "[PHONE]"),
    ]
    if display_name:
        replacements.append((re.escape(display_name), "[PATIENT]"))
    if internal_code:
        replacements.append((re.escape(internal_code), "[PATIENT_CODE]"))
    for pattern, repl in replacements:
        value = re.sub(pattern, repl, value, flags=re.IGNORECASE)
    return value
