import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageError, PageLoading } from "@/components/ui/page-state";
import { ClinicalSessionEditor } from "@/components/forms/ClinicalSessionEditor";
import { useAuth } from "@/hooks/useAuth";
import { clinicalService } from "@/services/clinicalService";
import { recordService } from "@/services/recordService";

export function ClinicalEditorPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [dirty, setDirty] = useState(false);
  const patients = useQuery({ queryKey: ["patients"], queryFn: clinicalService.getPatients });
  const patientId = params.get("patient") ?? "";
  const sessionId = params.get("session") ?? "";
  const selectedPatient = patients.data?.find((patient) => patient.id === patientId);
  const access = useQuery({ queryKey: ["patient-access", patientId, user?.id], queryFn: () => recordService.canEditPatient(patientId, user!.id), enabled: Boolean(selectedPatient && user) });
  const sessions = useQuery({ queryKey: ["editor-sessions", patientId], queryFn: () => recordService.getSessions(patientId), enabled: Boolean(selectedPatient) });
  const ownedSessions = sessions.data?.filter((session) => session.professionalId === user?.id) ?? [];
  const session = ownedSessions.find((item) => item.id === sessionId);
  const notes = useQuery({ queryKey: ["editor-notes", patientId, sessionId], queryFn: () => recordService.getNotes(patientId, sessionId), enabled: Boolean(session && access.data) });
  const note = notes.data?.find((item) => item.session === sessionId && String(item.author) === user?.id);

  function editorBody() {
    if (!selectedPatient) return <EmptyState title="Selecione um paciente" description="As sessões e as notas serão consultadas somente para o paciente selecionado." />;
    if (access.isLoading) return <PageLoading />;
    if (access.isError || !access.data) return <PageError description="Seu vínculo não permite edição clínica deste paciente. Solicite a revisão do acesso ao responsável." />;
    if (sessions.isLoading) return <PageLoading />;
    if (sessions.isError) return <PageError description="Não foi possível consultar as sessões. Tente novamente." />;
    if (!ownedSessions.length) return <EmptyState title="Nenhuma sessão sob sua responsabilidade" description="Agende uma sessão para este paciente antes de registrar a nota." />;
    if (!session) return <EmptyState title="Selecione uma sessão" description="Escolha uma sessão da lista para abrir o editor." />;
    if (notes.isLoading) return <PageLoading />;
    if (notes.isError) return <PageError description="Não foi possível consultar a nota. Confira sua permissão de acesso." />;
    return <Card><CardContent className="p-5">
      <h2 className="mb-4 text-headline-semibold">{selectedPatient.name} · {session.date}</h2>
      <ClinicalSessionEditor key={`${patientId}:${sessionId}:${note?.id ?? "new"}`} patientId={patientId} sessionId={sessionId} note={note} onDirtyChange={setDirty} />
    </CardContent></Card>;
  }
  return <>
    <PageHeader title="Editor Narrativo de Prontuário" description="Selecione o paciente e uma sessão sob sua responsabilidade para registrar a nota clínica." action={<ButtonLink to="/patients">Pacientes</ButtonLink>} />
    {patients.isLoading ? <PageLoading /> : patients.isError ? <PageError description="Não foi possível carregar os pacientes." /> : !patients.data?.length ? <EmptyState title="Cadastre um paciente para começar" description="Depois do cadastro, agende uma sessão e retorne ao editor." /> : <>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label htmlFor="editor-patient">Paciente</label><Select id="editor-patient" disabled={dirty} value={patientId} onChange={(event) => setParams(event.target.value ? { patient: event.target.value } : {})}><option value="">Selecione um paciente</option>{patients.data.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</Select></div>
        <div className="space-y-2"><label htmlFor="editor-session">Sessão</label><Select id="editor-session" disabled={!selectedPatient || sessions.isLoading || dirty} value={sessionId} onChange={(event) => setParams({ patient: patientId, session: event.target.value })}><option value="">Selecione uma sessão</option>{ownedSessions.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.title}</option>)}</Select></div>
      </div>
      {dirty && <p className="mb-4 text-body-regular text-status-yellow-text">Salve ou descarte as alterações antes de trocar de paciente ou sessão.</p>}
      {editorBody()}
      {selectedPatient && access.data && <div className="mt-4"><ButtonLink to={`/agenda?patient=${encodeURIComponent(patientId)}`}>Agendar sessão para este paciente</ButtonLink></div>}
    </>}
  </>;
}
