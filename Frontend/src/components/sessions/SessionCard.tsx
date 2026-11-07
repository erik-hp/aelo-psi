import { Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PatientNote, SessionStatus, TherapySession } from "@/types/clinical";

const statusLabel: Partial<Record<SessionStatus, string>> = {
  completed: "Concluída",
  draft: "Agendada",
  needs_review: "Evolução pendente",
  cancelled: "Cancelada",
  missed: "Não compareceu",
  in_progress: "Em atendimento",
};

export function SessionCard({ session, notes = [] }: { session: TherapySession; notes?: PatientNote[] }) {
  return (
    <article className="min-w-0">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h3 className="text-body-semibold">{session.title}</h3>
          <p className="mt-0.5 text-body-regular text-text-secondary">{session.date}</p>
        </div>
        <Badge variant={session.status === "completed" ? "success" : session.status === "needs_review" ? "warning" : "muted"}>
          {statusLabel[session.status] ?? session.status}
        </Badge>
      </div>
      <p className="aelo-record mt-3 text-text-secondary">{session.summary}</p>
      {notes.map((note) => (
        <div key={note.id} id={`note-${note.id}`} className="mt-3 rounded-md py-1 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-body-medium">
              <FileText className="h-4 w-4 text-text-secondary" aria-hidden="true" />
              Prontuário da sessão
            </div>
            {note.attentionIndex !== null ? <Badge variant={note.attentionIndex >= 80 ? "warning" : "muted"}>Atenção {note.attentionIndex}</Badge> : null}
          </div>
          <p className="aelo-record mt-2">{note.content}</p>
          {note.complement ? <p className="aelo-record mt-2 text-text-secondary">{note.complement}</p> : null}
        </div>
      ))}
      <p className="mt-3 flex items-center gap-2 text-caption-1-regular text-text-secondary">
        <Clock className="h-4 w-4" aria-hidden="true" />
        {session.duration === null ? "Duração não registrada" : `${session.duration} minutos`}
      </p>
    </article>
  );
}
