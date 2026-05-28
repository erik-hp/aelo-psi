import { Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PatientNote, TherapySession } from "@/types/clinical";

export function SessionCard({ session, notes = [] }: { session: TherapySession; notes?: PatientNote[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 className="font-semibold">{session.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{session.date}</p>
          </div>
          <Badge variant={session.status === "completed" ? "success" : session.status === "needs_review" ? "warning" : "muted"}>
            {session.status}
          </Badge>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{session.summary}</p>
        {notes.length ? (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {notes.map((note) => (
              <div key={note.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-primary" />
                    Prontuário da sessão
                  </div>
                  <Badge variant={note.attentionIndex >= 80 ? "warning" : "muted"}>{note.attentionIndex}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.content}</p>
                {note.complement ? <p className="mt-2 text-sm leading-6">{note.complement}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-4 w-4" />
          {session.duration} minutos
        </div>
      </CardContent>
    </Card>
  );
}
