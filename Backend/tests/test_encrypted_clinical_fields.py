import pytest
import base64
import importlib
import os
from django.conf import settings
from django.db import connection
from django.core.management import call_command
from django.test import override_settings

from apps.ai_analysis.models import AIAnalysis, AISource, HumanValidation, SentimentMetric
from apps.clinical_notes.models import ClinicalNote, ClinicalNoteHistory
from apps.therapy_sessions.models import TherapySession
from services.security.encrypted_fields import decrypt_text, encrypt_text

@pytest.mark.django_db
def test_clinical_text_is_ciphertext_at_rest_and_round_trips(request):
    records = request.getfixturevalue("records")
    note = records["note"]
    session = records["session"]
    session.summary = "Sensitive session summary"
    session.save(update_fields=["summary"])
    ClinicalNoteHistory.objects.create(
        note=note, edited_by=records["owner"], raw_text="Sensitive prior note", anonymized_text="Prior note", version=1
    )

    with connection.cursor() as cursor:
        cursor.execute("SELECT raw_text, anonymized_text FROM clinical_notes_clinicalnote WHERE id = %s", [note.id.hex])
        raw, anonymized = cursor.fetchone()
        cursor.execute("SELECT raw_text FROM clinical_notes_clinicalnotehistory")
        history_raw = cursor.fetchone()[0]
        cursor.execute("SELECT summary FROM therapy_sessions_therapysession WHERE id = %s", [session.id.hex])
        summary = cursor.fetchone()[0]

    assert all(value.startswith("enc:v2:") for value in (raw, anonymized, history_raw, summary))
    assert "Original text" not in raw
    assert "Sensitive" not in history_raw + summary
    assert ClinicalNote.objects.get(pk=note.pk).raw_text == "Original text"
    assert TherapySession.objects.get(pk=session.pk).summary == "Sensitive session summary"


def test_encryption_detects_tampering_and_supports_read_key_rotation():
    old_key = settings.CLINICAL_DATA_KEYS[0]
    new_key = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")
    old_ciphertext = encrypt_text("clinical secret")
    with override_settings(CLINICAL_DATA_KEYS=[new_key, old_key]):
        assert decrypt_text(old_ciphertext) == "clinical secret"
        assert decrypt_text(encrypt_text("new secret")) == "new secret"
        payload = bytearray(base64.urlsafe_b64decode(old_ciphertext.removeprefix("enc:v2:")))
        payload[-1] ^= 1
        tampered = "enc:v2:" + base64.urlsafe_b64encode(payload).decode("ascii")
        with pytest.raises(ValueError, match="authentication failed"):
            decrypt_text(tampered)


@pytest.mark.django_db
def test_data_migrations_encrypt_existing_plaintext(records):
    note = records["note"]
    session = records["session"]
    with connection.cursor() as cursor:
        cursor.execute("UPDATE clinical_notes_clinicalnote SET raw_text = %s, anonymized_text = %s WHERE id = %s", ["legacy note", "legacy note", note.id.hex])
        cursor.execute("UPDATE therapy_sessions_therapysession SET summary = %s WHERE id = %s", ["legacy summary", session.id.hex])

    class SchemaEditor:
        pass

    editor = SchemaEditor()
    editor.connection = connection
    notes_migration = importlib.import_module("apps.clinical_notes.migrations.0003_alter_clinicalnote_anonymized_text_and_more")
    sessions_migration = importlib.import_module("apps.therapy_sessions.migrations.0003_alter_therapysession_summary")
    notes_migration.encrypt_existing_notes(None, editor)
    sessions_migration.encrypt_existing_summaries(None, editor)

    assert ClinicalNote.objects.get(pk=note.pk).raw_text == "legacy note"
    assert TherapySession.objects.get(pk=session.pk).summary == "legacy summary"


@pytest.mark.django_db
def test_ai_output_and_review_are_ciphertext_at_rest(records):
    analysis = AIAnalysis.objects.create(
        patient=records["patient"], requested_by=records["owner"],
        patterns=["sensitive pattern"], raw_response={"source": "sensitive result"},
    )
    AISource.objects.create(analysis=analysis, note=records["note"], excerpt="sensitive excerpt")
    HumanValidation.objects.create(analysis=analysis, reviewed_by=records["owner"], decision="VALIDATED", comment="sensitive review")
    SentimentMetric.objects.create(analysis=analysis, label="anxiety", value=0.5, metadata={"comment": "sensitive metric"})

    with connection.cursor() as cursor:
        cursor.execute("SELECT patterns, raw_response FROM ai_analysis_aianalysis WHERE id = %s", [analysis.id.hex])
        patterns, raw_response = cursor.fetchone()
        cursor.execute("SELECT excerpt FROM ai_analysis_aisource")
        excerpt = cursor.fetchone()[0]
        cursor.execute("SELECT comment FROM ai_analysis_humanvalidation")
        comment = cursor.fetchone()[0]
        cursor.execute("SELECT metadata FROM ai_analysis_sentimentmetric")
        metadata = cursor.fetchone()[0]
    assert all("sensitive" not in value for value in (patterns, raw_response, excerpt, comment, metadata))
    assert AIAnalysis.objects.get(pk=analysis.pk).patterns == ["sensitive pattern"]
    assert AISource.objects.get(analysis=analysis).excerpt == "sensitive excerpt"
    assert HumanValidation.objects.get(analysis=analysis).comment == "sensitive review"
    assert SentimentMetric.objects.get(analysis=analysis).metadata == {"comment": "sensitive metric"}


@pytest.mark.django_db
def test_primary_key_rotation_reencrypts_existing_records(records):
    old_key = settings.CLINICAL_DATA_KEYS[0]
    new_key = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")
    with override_settings(CLINICAL_DATA_KEYS=[new_key, old_key]):
        call_command("rotate_clinical_keys", "--apply", verbosity=0)
    with override_settings(CLINICAL_DATA_KEYS=[new_key]):
        assert ClinicalNote.objects.get(pk=records["note"].pk).raw_text == "Original text"
