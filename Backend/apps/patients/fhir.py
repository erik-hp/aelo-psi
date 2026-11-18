"""A small FHIR R4 export of a single patient's current clinical record."""

import base64
from django.db.models import Q

from apps.clinical_notes.models import ClinicalNote, NoteStatus
from apps.therapy_sessions.models import TherapySession


ENCOUNTER_STATUS = {
    "SCHEDULED": "planned",
    "COMPLETED": "finished",
    "CANCELLED": "cancelled",
    "MISSED": "cancelled",
}


def _entry(resource):
    return {"fullUrl": f"urn:uuid:{resource['id']}", "resource": resource}


def patient_bundle(patient, *, official_only: bool = False):
    patient_id = str(patient.id)
    entries = [_entry({
        "resourceType": "Patient",
        "id": patient_id,
        "identifier": [{"value": patient.internal_code}],
        "name": [{"text": patient.display_name}],
        "active": patient.status == "ACTIVE",
    })]
    sessions = TherapySession.objects.filter(patient=patient, deleted_at__isnull=True).order_by("scheduled_at", "id")
    exported_session_ids = set()
    for session in sessions:
        exported_session_ids.add(session.id)
        encounter = {
            "resourceType": "Encounter",
            "id": str(session.id),
            "status": ENCOUNTER_STATUS[session.status],
            "class": {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "AMB"},
            "subject": {"reference": f"urn:uuid:{patient_id}"},
            "period": {"start": session.started_at.isoformat() if session.started_at else session.scheduled_at.isoformat()},
        }
        if session.ended_at:
            encounter["period"]["end"] = session.ended_at.isoformat()
        entries.append(_entry(encounter))
    notes = ClinicalNote.objects.select_related("author", "signed_by").filter(patient=patient, deleted_at__isnull=True)
    if official_only:
        notes = notes.filter(Q(locked_at__isnull=False) | Q(status__in=[NoteStatus.SIGNED, NoteStatus.AMENDED]))
    notes = notes.order_by("created_at", "id")
    for note in notes:
        is_final = bool(note.locked_at or note.status in {NoteStatus.SIGNED, NoteStatus.AMENDED})
        doc_status = "amended" if note.status == NoteStatus.AMENDED else ("final" if is_final else "preliminary")
        document = {
            "resourceType": "DocumentReference",
            "id": str(note.id),
            "status": "current",
            "docStatus": doc_status,
            "subject": {"reference": f"urn:uuid:{patient_id}"},
            "date": note.created_at.isoformat(),
            "description": f"Clinical note, version {note.version}",
            "content": [{"attachment": {
                "contentType": "text/plain; charset=utf-8",
                "data": base64.b64encode(note.raw_text.encode("utf-8")).decode("ascii"),
                "creation": note.created_at.isoformat(),
            }}],
        }
        if note.session_id in exported_session_ids:
            document["context"] = {"encounter": [{"reference": f"urn:uuid:{note.session_id}"}]}
        entries.append(_entry(document))
        if note.signed_by_id and note.signed_at:
            provenance = {
                "resourceType": "Provenance",
                "id": f"prov-{note.id}-v{note.version}",
                "target": [{"reference": f"urn:uuid:{note.id}"}],
                "recorded": note.signed_at.isoformat(),
                "activity": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
                        "code": "UPDATE" if note.status == NoteStatus.AMENDED else "CREATE",
                    }],
                },
                "agent": [{
                    "who": {"display": f"Professional {note.signed_by_id}"},
                }],
            }
            if note.signature:
                provenance["signature"] = [{
                    "type": [{"system": "urn:iso-astm:E1762-95:2013", "code": "1.2.840.10065.1.12.1.1"}],
                    "when": note.signed_at.isoformat(),
                    "who": {"display": f"Professional {note.signed_by_id}"},
                    "sigFormat": "application/octet-stream",
                    "data": note.signature,
                }]
            entries.append({"fullUrl": f"urn:aelo:provenance:{provenance['id']}", "resource": provenance})
    return {"resourceType": "Bundle", "type": "collection", "entry": entries}
