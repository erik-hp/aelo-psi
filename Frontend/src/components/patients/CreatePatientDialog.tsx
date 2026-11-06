import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordService } from "@/services/recordService";
import { apiErrorMessage } from "@/services/apiError";

export function CreatePatientDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const create = useMutation({ mutationFn: recordService.createPatient, onSuccess: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ["patients"] }), client.invalidateQueries({ queryKey: ["dashboard"] })]);
    onClose();
  } });
  return <Dialog open onClose={onClose} busy={create.isPending} title="Adicionar paciente" size="md">
    <h2 className="text-title-3-semibold text-text-primary">Adicionar paciente</h2>
    <p className="text-body-regular text-text-secondary">Cadastre os dados mínimos de identificação. Neste protótipo, utilize somente dados sintéticos.</p>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (name.trim() && code.trim()) create.mutate({ displayName: name, internalCode: code }); }}>
      <div className="space-y-2"><label htmlFor="patient-name">Nome de identificação</label><Input id="patient-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={180} autoFocus /></div>
      <div className="space-y-2"><label htmlFor="patient-code">Código interno</label><Input id="patient-code" value={code} onChange={(event) => setCode(event.target.value)} required maxLength={64} /><p className="text-caption-1-regular text-text-secondary">O código deve ser único na clínica.</p></div>
      {create.isError && <p role="alert" className="text-body-regular text-text-error-primary">{apiErrorMessage(create.error, "Não foi possível cadastrar o paciente. Tente novamente.")}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={create.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={create.isPending || !name.trim() || !code.trim()}>{create.isPending ? "Cadastrando…" : "Cadastrar paciente"}</Button></div>
    </form>
  </Dialog>;
}
