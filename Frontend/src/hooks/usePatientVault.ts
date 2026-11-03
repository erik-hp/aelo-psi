import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { clinicalService } from "@/services/clinicalService";
import { signingService } from "@/services/signingService";

export function usePatientVault(patientId: string) {
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"graph" | "timeline">("graph");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const { data: graph } = useQuery({ queryKey: ["vault", patientId], queryFn: () => clinicalService.getPatientVault(patientId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vault", patientId] });
  const create = useMutation({
    mutationFn: clinicalService.createVaultCheckpoint,
    onSuccess: () => { refresh(); setTab("timeline"); notify({ type: "success", title: "Checkpoint criado", description: "Revise as evidências antes de aprovar." }); },
    onError: () => notify({ type: "error", title: "Falha ao criar checkpoint", description: "Verifique a nota fonte e o serviço de IA." }),
  });
  const approve = useMutation({
    mutationFn: async ({ analysisId, justification }: { analysisId: string; justification: string }) => { if (!user) throw new Error("Usuário não autenticado"); await signingService.review(analysisId, "VALIDATED", justification, user.id); },
    onSuccess: () => { setApprovalId(null); refresh(); queryClient.invalidateQueries({ queryKey: ["patient", patientId] }); },
    onError: () => notify({ type: "error", title: "Falha na aprovação", description: "Confira sua permissão e chave de assinatura." }),
  });
  const preview = useMutation({ mutationFn: clinicalService.getVaultCheckpoint, onSuccess: setMarkdown });
  return { user, graph, tab, setTab, selectedNode, setSelectedNode, markdown, approvalId, setApprovalId, create, approve, preview };
}
