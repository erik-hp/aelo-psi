"""A small FHIR R4 export of a single patient's current clinical record."""

import base64

from apps.clinical_notes.models import ClinicalNote
from apps.therapy_sessions.models import TherapySession


ENCOUNTER_STATUS = {
    "SCHEDULED": "planned",
    "COMPLETED": "finished",
    "CANCELLED": "cancelled",
    "MISSED": "cancelled",
}


def _entry(resource):
    return {"fullUrl": f"urn:uuid:{resource['id']}", "resource": resource}


def patient_bundle(patient):
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
    notes = ClinicalNote.objects.filter(patient=patient, deleted_at__isnull=True).order_by("created_at", "id")
    for note in notes:
        document = {
            "resourceType": "DocumentReference",
            "id": str(note.id),
            "status": "current",
            "docStatus": "final" if note.locked_at else "preliminary",
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
    return {"resourceType": "Bundle", "type": "collection", "entry": entries}
