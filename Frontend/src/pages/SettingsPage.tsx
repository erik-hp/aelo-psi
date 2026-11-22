import { RiSettings3Line } from "@remixicon/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isApiMode } from "@/services/runtime";

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" description="Informações da aplicação. A edição de preferências ainda não está disponível nesta tela." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RiSettings3Line aria-hidden="true" className="size-4" /> Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-body-regular text-text-secondary">
            <p>Refresh token automático habilitado.</p>
            <p>Logout por sessão expirada configurado.</p>
            <p>Controle visual por permissão ativo.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="muted">{isApiMode ? "Modo API" : "Demonstração"}</Badge>
            <p className="text-body-regular text-text-secondary">O modo configurado não comprova a disponibilidade dos serviços. Falhas são informadas nas telas que os consultam.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
