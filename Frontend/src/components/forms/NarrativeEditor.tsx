import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Clock, FileEdit, FileText, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clinicalDraftService } from "@/services/clinicalDraftService";
import { isApiMode } from "@/services/runtime";

const noteSchema = z.object({
  title: z.string().min(3, "Informe um título clínico."),
  content: z.string().min(30, "A nota precisa ter conteúdo suficiente para análise (mínimo 30 caracteres)."),
});

export type NoteValues = z.infer<typeof noteSchema>;

export interface NarrativeEditorProps {
  initialTitle?: string;
  initialContent?: string;
  patientId?: string;
  onSave?: (data: { title: string; content: string }) => Promise<void> | void;
  onRequestAnalysis?: (content: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

const TEMPLATE_SOAP = `[S - SUBJETIVO]
Paciente relata sentimentos de...

[O - OBJETIVO]
Observações clínicas do terapeuta (afeto, postura, fala, contato visual, estado de atenção)...

[A - AVALIAÇÃO]
Análise psicoterapêutica, evolução dos sintomas e respostas às intervenções da sessão...

[P - PLANO]
Metas para a próxima sessão, autorregistros pactuados e encaminhamentos...`;

const TEMPLATE_DAP = `[D - DADOS]
Relato empírico do paciente e principais temas trazidos na sessão de hoje...

[A - AVALIAÇÃO]
Compreensão diagnóstica longitudinal, conexões funcionais e hipóteses clínicas do psicólogo...

[P - PLANO]
Plano de acompanhamento continuado, tarefas intersessão e direcionamentos...`;

export function NarrativeEditor({
  initialTitle,
  initialContent,
  patientId,
  onSave,
  onRequestAnalysis,
  isSubmitting = false,
}: NarrativeEditorProps) {
  const storageKey = `draft_narrative_${patientId || "new"}`;
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [saveRevision, setSaveRevision] = useState(0);
  const draftVersion = useRef(0);
  const saving = useRef(false);
  const discarding = useRef(false);
  const savePromise = useRef<Promise<unknown> | null>(null);
  const lastPersisted = useRef("");

  // Recupera uma cópia antiga apenas após autenticação e autorização no servidor.
  const defaultInitial = useMemo(() => ({
      title: initialTitle || "Sessão de acompanhamento longitudinal",
      content:
        initialContent ||
        "Paciente relata melhora gradual na identificação de gatilhos ansiosos, mantendo dificuldade de desconexão cognitiva no período noturno. Foram revisadas estratégias de rotina e autorregistro semanal.",
    }), [initialTitle, initialContent]);

  const form = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: defaultInitial,
    mode: "onChange",
  });

  const { watch, setValue, handleSubmit, formState, reset } = form;
  const currentTitle = watch("title");
  const currentContent = watch("content");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (!isApiMode || !patientId) {
          localStorage.removeItem(storageKey);
          if (active) setDraftReady(true);
          return;
        }
        const serverDraft = await clinicalDraftService.get(patientId);
        let selected = serverDraft;
        const legacy = localStorage.getItem(storageKey);
        if (legacy) {
          let parsed: { title?: string; content?: string } | null = null;
          try { parsed = JSON.parse(legacy); } catch { localStorage.removeItem(storageKey); }
          if (parsed && window.confirm("Importar o rascunho clínico antigo deste navegador para o servidor protegido?")) {
            const title = String(parsed.title || defaultInitial.title);
            const content = String(parsed.content || "");
            const version = await clinicalDraftService.put(patientId, { title, content, version: serverDraft?.version ?? 0 });
            selected = { title, content, version };
            localStorage.removeItem(storageKey);
          } else if (parsed) {
            localStorage.removeItem(storageKey);
          }
        }
        if (active) {
          if (selected) {
            draftVersion.current = selected.version;
            reset({ title: selected.title, content: selected.content });
            lastPersisted.current = JSON.stringify({ title: selected.title, content: selected.content });
          } else {
            lastPersisted.current = JSON.stringify(defaultInitial);
          }
          setDraftReady(true);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && [403, 404].includes(error.response?.status ?? 0)) localStorage.removeItem(storageKey);
        if (active) setDraftError(true);
      }
    };
    void load();
    return () => { active = false; };
  }, [patientId, storageKey, reset, defaultInitial]);

  // Persist only to the encrypted, user-scoped server draft.
  useEffect(() => {
    if (!isApiMode || !patientId || !draftReady || saving.current || discarding.current) return;
    const snapshot = JSON.stringify({ title: currentTitle, content: currentContent });
    if (snapshot === lastPersisted.current) return;
    const timer = setTimeout(() => {
      saving.current = true;
      savePromise.current = clinicalDraftService.put(patientId, { title: currentTitle, content: currentContent, version: draftVersion.current })
        .then((version) => {
          draftVersion.current = version;
          lastPersisted.current = snapshot;
          setLastSavedTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
          setDraftError(false);
        })
        .catch(() => setDraftError(true))
        .finally(() => { saving.current = false; savePromise.current = null; setSaveRevision((value) => value + 1); });
    }, 600);
    return () => clearTimeout(timer);
  }, [currentTitle, currentContent, draftReady, patientId, saveRevision]);

  // Contadores dinâmicos de caracteres e estimativa de leitura (Fitts e ergonomia visual)
  const charCount = currentContent?.length || 0;
  const wordCount = currentContent?.trim() ? currentContent.trim().split(/\s+/).length : 0;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const applyTemplate = (templateContent: string) => {
    setValue("content", templateContent, { shouldValidate: true, shouldDirty: true });
  };

  const handleClearDraft = async () => {
    if (window.confirm("Deseja realmente limpar o rascunho atual desta sessão?")) {
      discarding.current = true;
      try {
        await savePromise.current;
        if (isApiMode && patientId) await clinicalDraftService.remove(patientId);
      } catch {
        setDraftError(true);
        discarding.current = false;
        return;
      }
      draftVersion.current = 0;
      lastPersisted.current = JSON.stringify({ title: "Sessão de acompanhamento longitudinal", content: "" });
      reset({ title: "Sessão de acompanhamento longitudinal", content: "" });
      setLastSavedTime(null);
      setDraftError(false);
      discarding.current = false;
    }
  };

  const onSubmit = async (values: NoteValues) => {
    if (onSave) {
      await onSave(values);
    }
    if (onRequestAnalysis) {
      await onRequestAnalysis(values.content);
    }
    await savePromise.current?.catch(() => undefined);
    if (isApiMode && patientId) await clinicalDraftService.remove(patientId);
    setLastSavedTime(null);
  };

  // Atalho de ergonomia motora: Ctrl+Enter / Cmd+Enter submete o formulário (Lei de Fitts)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSubmit(onSubmit)();
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {/* Barra de utilitários clínicos: Scaffolds estruturados e status de autosave */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-secondary/30 p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
            <FileEdit className="h-3.5 w-3.5 text-primary" />
            Modelos Clínicos (CFP 01/2009):
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyTemplate(TEMPLATE_SOAP)}
            className="h-7 text-xs font-medium"
            title="Preencher com estrutura Subjetivo, Objetivo, Avaliação e Plano"
          >
            Template SOAP
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyTemplate(TEMPLATE_DAP)}
            className="h-7 text-xs font-medium"
            title="Preencher com estrutura Dados, Avaliação e Plano"
          >
            Template DAP
          </Button>
        </div>

        {/* Indicador de Salvamento Automático e Limpar Rascunho */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {lastSavedTime ? (
            <span className="flex items-center gap-1 text-accent font-medium">
              <Check className="h-3.5 w-3.5" />
            Rascunho salvo no servidor às {lastSavedTime}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              {draftError ? "Falha no autosave; copie seu texto antes de sair" : isApiMode && patientId ? "Autosave no servidor" : "Rascunho apenas nesta página"}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { void handleClearDraft(); }}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            title="Descartar rascunho clínico"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar rascunho
          </Button>
        </div>
      </div>

      {/* Título da Nota */}
      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="title">
          Título da nota clínica
        </label>
        <input
          id="title"
          className="focus-ring mt-2 w-full border-0 border-b border-border bg-transparent pb-2 text-xl font-semibold outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/60"
          placeholder="Ex: Sessão 12 - Regulação emocional e autorregistro"
          {...form.register("title")}
        />
        {formState.errors.title ? (
          <p className="mt-1 text-xs text-destructive">{formState.errors.title.message}</p>
        ) : null}
      </div>

      {/* Área da Narrativa Clínica */}
      <div>
        <label className="sr-only" htmlFor="content">
          Nota narrativa da sessão
        </label>
        <Textarea
          id="content"
          className="min-h-[380px] font-sans text-base leading-7 placeholder:text-muted-foreground/50 resize-y"
          placeholder="Descreva a evolução da sessão, falas do paciente, intervenções aplicadas e desfechos..."
          onKeyDown={handleKeyDown}
          {...form.register("content")}
        />
        {formState.errors.content ? (
          <p className="mt-1 text-xs text-destructive">{formState.errors.content.message}</p>
        ) : null}
      </div>

      {/* Barra de Rodapé: Contadores, Atalhos e Botão de Submissão (Fitts e Doherty) */}
      <div className="flex flex-col-reverse justify-between gap-4 border-t border-border/80 pt-4 sm:flex-row sm:items-center">
        {/* Contadores e Ergonomia Cognitiva */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {charCount.toLocaleString("pt-BR")} caracteres · {wordCount} palavras
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            ~{readingTimeMin} min de leitura
          </span>
          <span className="hidden lg:inline text-muted-foreground/70">
            Atalho: <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl+Enter</kbd> para enviar
          </span>
        </div>

        {/* Ação Primária */}
        <Button
          type="submit"
          disabled={isSubmitting || (isApiMode && !!patientId && !draftReady) || !formState.isValid}
          className="gap-2 px-6 font-semibold shadow-md"
        >
          <Sparkles className="h-4 w-4" />
          {isSubmitting ? "Enviando análise..." : "Solicitar análise assistiva"}
        </Button>
      </div>
    </form>
  );
}
