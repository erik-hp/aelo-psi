import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/dialog";
import { recordService, type ClinicalNoteRecord } from "@/services/recordService";
import { apiErrorMessage } from "@/services/apiError";
import { clinicalService } from "@/services/clinicalService";
import { Dialog } from "@/components/ui/modal";
import { ButtonLink } from "@/components/ui/button-link";

export function ClinicalSessionEditor({ patientId, sessionId, note, onDirtyChange }: {
  patientId: string; sessionId: string; note?: ClinicalNoteRecord; onDirtyChange: (dirty: boolean) => void;
}) {
  const client = useQueryClient();
  const [content, setContent] = useState(note?.raw_text ?? "");
  const [savedContent, setSavedContent] = useState(note?.raw_text ?? "");
  const [noteId, setNoteId] = useState(note?.id);
  const [version, setVersion] = useState(note?.version);
  const [discarding, setDiscarding] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [jobId, setJobId] = useState("");
  const dirty = content !== savedContent;
  const locked = Boolean(note?.locked_at);
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
  const save = useMutation({
    mutationFn: () => recordService.saveNote({ patientId, sessionId, noteId, expectedVersion: version, content }),
    onSuccess: (saved) => {
      setNoteId(saved.id); setVersion(saved.version); setSavedContent(saved.raw_text);
      void client.invalidateQueries({ queryKey: ["patient-notes", patientId] });
      void client.invalidateQueries({ queryKey: ["editor-notes", patientId] });
      void client.invalidateQueries({ queryKey: ["patient", patientId] });
    },
  });
  const preview = useMutation({ mutationFn: () => clinicalService.previewAiText(patientId, content), onSuccess: setPreviewText });
  const request = useMutation({ mutationFn: () => recordService.requestNoteAnalysis(patientId, noteId!), onSuccess: (job) => { setJobId(job.job_id); setPreviewText(null); } });
  const job = useQuery({ queryKey: ["editor-analysis-job", jobId], queryFn: () => recordService.getAnalysisJob(jobId), enabled: Boolean(jobId), refetchInterval: (query) => ["COMPLETED", "FAILED"].includes(query.state.data?.status ?? "") ? false : 3000 });
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!locked && content.trim() && dirty) save.mutate(); }}>
    <p className="text-body-regular text-text-secondary">Salve explicitamente antes de sair. A nota é registrada no servidor; não depende da IA e não é assinada por este botão.</p>
    {locked && <p role="status" className="text-body-medium text-status-yellow-text">Nota assinada: leitura disponível. O fluxo de retificação ainda não está disponível nesta tela.</p>}
    <label htmlFor="clinical-session-note" className="block text-body-medium">Nota da sessão</label>
    <Textarea id="clinical-session-note" rows={14} maxLength={50000} value={content} onChange={(event) => setContent(event.target.value)} readOnly={locked || save.isPending} required placeholder="Escreva o registro desta sessão. Nenhum texto clínico é preenchido automaticamente." />
    <p role="status" className="text-caption-1-regular text-text-secondary">{dirty ? "Alterações ainda não salvas." : noteId ? `Nota salva no servidor · versão ${version}.` : "Nenhuma nota salva nesta sessão."}</p>
    {save.isError && <p role="alert" className="text-body-regular text-text-error-primary">{apiErrorMessage(save.error, "Falha ao salvar. O texto foi mantido para nova tentativa.")}</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={locked || save.isPending || !dirty || !content.trim()}>{save.isPending ? "Salvando…" : "Salvar nota"}</Button>
      {dirty && <Button variant="outline" disabled={save.isPending} onClick={() => setDiscarding(true)}>Descartar alterações</Button>}
      <Button variant="outline" disabled={!noteId || dirty || content.trim().length < 30 || preview.isPending || request.isPending || (Boolean(jobId) && !["COMPLETED", "FAILED"].includes(job.data?.status ?? ""))} onClick={() => preview.mutate()}>Revisar texto para IA</Button>
    </div>
    {preview.isError && <p role="alert" className="text-text-error-primary">{apiErrorMessage(preview.error, "Não foi possível preparar o texto para revisão. A nota salva foi preservada.")}</p>}
    {jobId && <div role="status" className="text-body-regular text-text-secondary">{job.isError ? "Falha ao consultar o processamento. A nota salva foi preservada." : job.data?.status === "FAILED" ? "A análise falhou. Nenhuma síntese fictícia foi produzida; a nota salva permanece disponível." : job.data?.status === "COMPLETED" ? "Análise disponível para revisão no perfil do paciente." : "Solicitação de análise registrada. Aguardando o serviço de IA; a nota já está salva."}<div className="mt-2"><ButtonLink to={`/patients/${patientId}`}>Ver perfil e análises</ButtonLink></div></div>}
    <Dialog open={previewText !== null} onClose={() => setPreviewText(null)} busy={request.isPending} title="Revisar texto antes de solicitar análise">
      <h2 className="text-title-3-semibold">Revisar texto antes de solicitar análise</h2><p>A desidentificação pode ser incompleta. Confira o texto preparado antes de confirmar.</p><pre className="whitespace-pre-wrap break-words rounded-xl bg-background-secondary-default p-4 text-body-regular">{previewText}</pre>
      {request.isError && <p role="alert" className="text-text-error-primary">{apiErrorMessage(request.error, "A solicitação falhou. A nota salva foi preservada.")}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={request.isPending} onClick={() => setPreviewText(null)}>Cancelar</Button><Button disabled={request.isPending} onClick={() => request.mutate()}>Confirmar solicitação de análise</Button></div>
    </Dialog>
    <ConfirmDialog open={discarding} title="Descartar alterações?" description="O texto não salvo será descartado. A nota registrada no servidor será preservada." onClose={() => setDiscarding(false)} onConfirm={() => { setContent(savedContent); setDiscarding(false); }} />
  </form>;
}
