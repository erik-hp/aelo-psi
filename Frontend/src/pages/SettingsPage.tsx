import { Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" description="Parâmetros globais de segurança, integração com API e preferências clínicas." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4" /> Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
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
            <Badge variant="success">Django REST API ready</Badge>
            <Badge variant="muted">Axios interceptors</Badge>
            <Badge variant="muted">TanStack Query cache</Badge>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
