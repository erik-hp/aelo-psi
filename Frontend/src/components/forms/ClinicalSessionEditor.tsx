import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/dialog";
import { recordService, type ClinicalNoteRecord, type ClinicalNoteStatus } from "@/services/recordService";
import { apiErrorMessage } from "@/services/apiError";
import { clinicalService } from "@/services/clinicalService";
import { signingService } from "@/services/signingService";
import { Dialog } from "@/components/ui/modal";
import { ButtonLink } from "@/components/ui/button-link";
import { useAuth } from "@/hooks/useAuth";

const STATUS_LABELS: Record<ClinicalNoteStatus, { label: string; variant: "muted" | "warning" | "success" | "default" }> = {
  DRAFT: { label: "Rascunho", variant: "muted" },
  IN_REVIEW: { label: "Em revisão", variant: "warning" },
  SIGNED: { label: "Assinada", variant: "success" },
  AMENDED: { label: "Retificada e assinada", variant: "default" },
};

export function ClinicalSessionEditor({ patientId, sessionId, note, onDirtyChange }: {
  patientId: string; sessionId: string; note?: ClinicalNoteRecord; onDirtyChange: (dirty: boolean) => void;
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [content, setContent] = useState(note?.raw_text ?? "");
  const [savedContent, setSavedContent] = useState(note?.raw_text ?? "");
  const [noteId, setNoteId] = useState(note?.id);
  const [version, setVersion] = useState(note?.version);
  const [lockedAt, setLockedAt] = useState<string | null>(note?.locked_at ?? null);
  const [noteStatus, setNoteStatus] = useState<ClinicalNoteStatus>(note?.status ?? (note?.locked_at ? "SIGNED" : "DRAFT"));
  const [discarding, setDiscarding] = useState(false);
  const [confirmSign, setConfirmSign] = useState(false);
  const [amending, setAmending] = useState(false);
  const [amendText, setAmendText] = useState("");
  const [amendReason, setAmendReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [jobId, setJobId] = useState("");
  const dirty = content !== savedContent;
  const locked = Boolean(lockedAt) || noteStatus === "SIGNED" || noteStatus === "AMENDED";

  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    const confirmLink = (event: MouseEvent) => {
      if (!dirty || event.ctrlKey || event.metaKey || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (link && link.target !== "_blank" && !window.confirm("Há alterações não salvas nesta nota. Sair sem salvar?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", confirmLink, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", confirmLink, true); };
  }, [dirty]);

  function applySavedRecord(saved: ClinicalNoteRecord) {
    setNoteId(saved.id);
    setVersion(saved.version);
    setSavedContent(saved.raw_text);
    setContent(saved.raw_text);
    setLockedAt(saved.locked_at ?? null);
    setNoteStatus(saved.status ?? (saved.locked_at ? "SIGNED" : "DRAFT"));
    void client.invalidateQueries({ queryKey: ["patient-notes", patientId] });
    void client.invalidateQueries({ queryKey: ["editor-notes", patientId] });
    void client.invalidateQueries({ queryKey: ["note-history", saved.id] });
    void client.invalidateQueries({ queryKey: ["patient", patientId] });
  }

  const save = useMutation({
    mutationFn: () => recordService.saveNote({ patientId, sessionId, noteId, expectedVersion: version, content }),
    onSuccess: applySavedRecord,
  });
  const submitReview = useMutation({
    mutationFn: () => recordService.submitNoteReview(noteId!),
    onSuccess: applySavedRecord,
  });
  const sign = useMutation({
    mutationFn: () => {
      if (!user || !noteId) throw new Error("Sessão inválida para assinatura.");
      return signingService.signNote(noteId, user.id);
    },
    onSuccess: (signed) => {
      setConfirmSign(false);
      applySavedRecord(signed);
    },
  });
  const amend = useMutation({
    mutationFn: () => {
      if (!user || !noteId) throw new Error("Sessão inválida para retificação.");
      return signingService.amendNote(noteId, amendText, amendReason, user.id);
    },
    onSuccess: (amended) => {
      setAmending(false);
      setAmendReason("");
      applySavedRecord(amended);
    },
  });
  const history = useQuery({
    queryKey: ["note-history", noteId],
    queryFn: () => recordService.getNoteHistory(noteId!),
    enabled: Boolean(noteId && showHistory),
  });
  const preview = useMutation({ mutationFn: () => clinicalService.previewAiText(patientId, content), onSuccess: setPreviewText });
  const request = useMutation({ mutationFn: () => recordService.requestNoteAnalysis(patientId, noteId!), onSuccess: (job) => { setJobId(job.job_id); setPreviewText(null); } });
  const job = useQuery({ queryKey: ["editor-analysis-job", jobId], queryFn: () => recordService.getAnalysisJob(jobId), enabled: Boolean(jobId), refetchInterval: (query) => ["COMPLETED", "FAILED"].includes(query.state.data?.status ?? "") ? false : 3000 });

  const statusMeta = STATUS_LABELS[noteStatus] ?? STATUS_LABELS.DRAFT;

  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!locked && content.trim() && dirty) save.mutate(); }}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-body-regular text-text-secondary">Salve explicitamente antes de sair. A nota é registrada no servidor; não depende da IA e não é assinada por este botão.</p>
      {noteId && <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>}
    </div>
    {locked && <p role="status" className="rounded-xl border border-[var(--aelo-thread)] bg-[var(--aelo-accent-soft)] p-3 text-body-medium text-text-primary">Nota assinada e bloqueada contra alteração direta. Para corrigir ou complementar preservando o histórico íntegro, utilize a retificação formal.</p>}
    <label htmlFor="clinical-session-note" className="block text-body-medium">Nota da sessão</label>
    <Textarea id="clinical-session-note" record rows={14} maxLength={50000} value={content} onChange={(event) => setContent(event.target.value)} readOnly={locked || save.isPending} required placeholder="Escreva o registro desta sessão. Nenhum texto clínico é preenchido automaticamente." />
    <p role="status" className="text-caption-1-regular text-text-secondary">{dirty ? "Alterações ainda não salvas." : noteId ? `Nota salva no servidor, versão ${version}.` : "Nenhuma nota salva nesta sessão."}</p>
    {save.isError && <p role="alert" className="text-body-regular text-text-error-primary">{apiErrorMessage(save.error, "Falha ao salvar. O texto foi mantido para nova tentativa.")}</p>}
    {sign.isError && <p role="alert" className="text-body-regular text-text-error-primary">{apiErrorMessage(sign.error, "Falha ao assinar a nota clínica.")}</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={locked || save.isPending || !dirty || !content.trim()}>{save.isPending ? "Salvando…" : "Salvar nota"}</Button>
      {dirty && <Button variant="outline" disabled={save.isPending} onClick={() => setDiscarding(true)}>Descartar alterações</Button>}
      {!locked && noteId && !dirty && noteStatus === "DRAFT" && user?.role === "PSYCHOLOGIST" && (
        <Button variant="outline" disabled={submitReview.isPending} onClick={() => submitReview.mutate()}>Submeter à revisão</Button>
      )}
      {!locked && noteId && !dirty && user?.role === "PSYCHOLOGIST" && (
        <Button variant="outline" disabled={sign.isPending} onClick={() => setConfirmSign(true)}>Assinar nota</Button>
      )}
      {locked && noteId && user?.role === "PSYCHOLOGIST" && (
        <Button variant="outline" onClick={() => { setAmendText(savedContent); setAmendReason(""); setAmending(true); }}>Retificar nota assinada</Button>
      )}
      {noteId && (version ?? 1) > 1 && (
        <Button variant="ghost" onClick={() => setShowHistory((prev) => !prev)}>{showHistory ? "Ocultar histórico" : "Ver histórico de versões"}</Button>
      )}
    </div>
    <div className="space-y-2 rounded-2xl border border-dashed border-[var(--aelo-thread)] p-4">
      <p className="text-body-regular text-text-secondary">Análise assistiva por IA: só começa depois que você salva a nota e confere o texto que será enviado. A síntese fica pendente até a sua revisão.</p>
      <Button variant="outline" disabled={!noteId || dirty || content.trim().length < 30 || preview.isPending || request.isPending || (Boolean(jobId) && !["COMPLETED", "FAILED"].includes(job.data?.status ?? ""))} onClick={() => preview.mutate()}>Revisar texto para IA</Button>
    </div>
    {showHistory && noteId && (
      <div className="space-y-3 rounded-xl border border-border-button-default bg-background-secondary-default p-4">
        <h3 className="text-body-semibold text-text-primary">Versões arquivadas</h3>
        {history.isLoading ? <p className="text-caption-1-regular text-text-secondary">Carregando histórico…</p> : history.isError ? <p role="alert" className="text-caption-1-regular text-text-error-primary">Não foi possível consultar o histórico da nota.</p> : !history.data?.length ? <p className="text-caption-1-regular text-text-secondary">Nenhuma versão anterior arquivada.</p> : (
          <ul className="space-y-3">
            {history.data.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border-button-default bg-background-primary-default p-3 space-y-1">
                <p className="text-caption-1-semibold text-text-primary">Versão {entry.version} {entry.status_at_archive ? `(${entry.status_at_archive})` : ""} · {new Date(entry.created_at).toLocaleString("pt-BR")}</p>
                {entry.amendment_reason && <p className="text-caption-1-regular text-text-secondary">Motivo da retificação: {entry.amendment_reason}</p>}
                <p className="aelo-record whitespace-pre-wrap break-words text-body-regular text-text-secondary">{entry.raw_text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
    {preview.isError && <p role="alert" className="text-text-error-primary">{apiErrorMessage(preview.error, "Não foi possível preparar o texto para revisão. A nota salva foi preservada.")}</p>}
    {jobId && <div role="status" className="text-body-regular text-text-secondary">{job.isError ? "Falha ao consultar o processamento. A nota salva foi preservada." : job.data?.status === "FAILED" ? "A análise falhou. Nenhuma síntese fictícia foi produzida; a nota salva permanece disponível." : job.data?.status === "COMPLETED" ? "Análise disponível para revisão no perfil do paciente." : "Solicitação de análise registrada. Aguardando o serviço de IA; a nota já está salva."}<div className="mt-2"><ButtonLink to={`/patients/${patientId}`}>Ver perfil e análises</ButtonLink></div></div>}
    <Dialog open={previewText !== null} onClose={() => setPreviewText(null)} busy={request.isPending} title="Revisar texto antes de solicitar análise">
      <h2 className="text-title-3-semibold">Revisar texto antes de solicitar análise</h2><p>A desidentificação pode ser incompleta. Confira o texto preparado antes de confirmar.</p><pre className="whitespace-pre-wrap break-words rounded-xl bg-background-secondary-default p-4 text-body-regular">{previewText}</pre>
      {request.isError && <p role="alert" className="text-text-error-primary">{apiErrorMessage(request.error, "A solicitação falhou. A nota salva foi preservada.")}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={request.isPending} onClick={() => setPreviewText(null)}>Cancelar</Button><Button disabled={request.isPending} onClick={() => request.mutate()}>Confirmar solicitação de análise</Button></div>
    </Dialog>
    <Dialog open={amending} onClose={() => setAmending(false)} busy={amend.isPending} title="Retificação formal de nota assinada">
      <div className="space-y-3">
        <h2 className="text-title-3-semibold text-text-primary">Retificação formal de nota assinada</h2>
        <p className="text-caption-1-regular text-text-secondary">A versão assinada atual permanecerá preservada no histórico auditável. Registre o texto retificado e o motivo técnico da retificação.</p>
        <div className="space-y-1.5">
          <label htmlFor="amend-note-text" className="block text-body-medium">Texto retificado da nota</label>
          <Textarea id="amend-note-text" record rows={8} maxLength={50000} value={amendText} onChange={(event) => setAmendText(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="amend-note-reason" className="block text-body-medium">Motivo formal da retificação</label>
          <Textarea id="amend-note-reason" rows={3} maxLength={2000} value={amendReason} onChange={(event) => setAmendReason(event.target.value)} placeholder="Descreva o motivo da retificação (mínimo de 10 caracteres)…" />
        </div>
        {amend.isError && <p role="alert" className="text-body-regular text-text-error-primary">{apiErrorMessage(amend.error, "Não foi possível registrar a retificação.")}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={amend.isPending} onClick={() => setAmending(false)}>Cancelar</Button>
          <Button disabled={amend.isPending || !amendText.trim() || amendText === savedContent || amendReason.trim().length < 10} onClick={() => amend.mutate()}>{amend.isPending ? "Assinando retificação…" : "Assinar retificação"}</Button>
        </div>
      </div>
    </Dialog>
    <ConfirmDialog open={confirmSign} title="Assinar nota clínica?" description="Após a assinatura criptográfica, a nota será bloqueada contra edição direta e qualquer ajuste posterior exigirá retificação formal com motivo registrado." confirmLabel="Assinar e bloquear" onClose={() => setConfirmSign(false)} onConfirm={() => sign.mutate()} />
    <ConfirmDialog open={discarding} title="Descartar alterações?" description="O texto não salvo será descartado. A nota registrada no servidor será preservada." onClose={() => setDiscarding(false)} onConfirm={() => { setContent(savedContent); setDiscarding(false); }} />
  </form>;
}
