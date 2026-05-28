import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { sanitizeText } from "@/utils/sanitize";

const noteSchema = z.object({
  title: z.string().min(3, "Informe um título clínico."),
  content: z.string().min(30, "A nota precisa ter conteúdo suficiente para análise."),
});

export type NoteValues = z.infer<typeof noteSchema>;

interface NarrativeEditorProps {
  onRequestAnalysis?: (content: string) => void;
}

export function NarrativeEditor({ onRequestAnalysis }: NarrativeEditorProps) {
  const { notify } = useToast();
  const form = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "Sessão de acompanhamento longitudinal",
      content:
        "Paciente relata melhora gradual na identificação de gatilhos ansiosos, mantendo dificuldade de desconexão cognitiva no período noturno. Foram revisadas estratégias de rotina e autorregistro semanal.",
    },
  });

  function save(values: NoteValues) {
    const safeContent = sanitizeText(values.content);
    window.localStorage.setItem("aelo.draft_note", JSON.stringify({ ...values, content: safeContent }));
    notify({ type: "success", title: "Nota salva", description: "Rascunho clínico preservado localmente." });
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(save)}>
      <div>
        <label className="text-sm font-medium" htmlFor="title">Título da nota</label>
        <input
          id="title"
          className="focus-ring mt-2 w-full border-0 border-b border-border bg-transparent pb-3 text-xl font-semibold outline-none"
          {...form.register("title")}
        />
        {form.formState.errors.title ? <p className="mt-1 text-xs text-destructive">{form.formState.errors.title.message}</p> : null}
      </div>
      <div>
        <label className="sr-only" htmlFor="content">Nota narrativa</label>
        <Textarea id="content" className="min-h-[420px] text-base leading-8" {...form.register("content")} />
        {form.formState.errors.content ? <p className="mt-1 text-xs text-destructive">{form.formState.errors.content.message}</p> : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" variant="outline">
          <Save className="h-4 w-4" />
          Salvar rascunho
        </Button>
        <Button type="button" onClick={form.handleSubmit((values) => onRequestAnalysis?.(sanitizeText(values.content)))}>
          <Sparkles className="h-4 w-4" />
          Solicitar análise assistiva
        </Button>
      </div>
    </form>
  );
}
