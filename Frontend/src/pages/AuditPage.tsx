import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AuditTable } from "@/components/audit/AuditTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { auditEvents } from "@/services/mockData";

export function AuditPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const events = useMemo(() => {
    return auditEvents.filter((event) => {
      const text = `${event.actor} ${event.action} ${event.entity}`.toLowerCase();
      return text.includes(search.toLowerCase()) && (role === "all" || event.role === role);
    });
  }, [role, search]);

  return (
    <>
      <PageHeader title="Auditoria" description="Eventos, filtros, pesquisa de ações e histórico de alterações para rastreabilidade clínica." />
      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar ação, usuário ou entidade" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="all">Todos os perfis</option>
          <option value="ADMIN">ADMIN</option>
          <option value="PSYCHOLOGIST">PSYCHOLOGIST</option>
          <option value="INTERN">INTERN</option>
        </Select>
      </div>
      <AuditTable events={events} />
    </>
  );
}
