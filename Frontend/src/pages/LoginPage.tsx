import { Navigate } from "react-router-dom";
import { Brain, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/forms/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { isApiMode } from "@/services/runtime";

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center px-6 py-10 lg:px-16">
        <div className="max-w-2xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold">AELO</h1>
              <p className="text-sm text-muted-foreground">Plataforma clínica psicológica</p>
            </div>
          </div>
          <h2 className="max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
            Gestão clínica, prontuário narrativo e análise longitudinal em um ambiente seguro.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Interface desenhada para leitura prolongada, validação humana e organização de evidências clínicas.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center border-l border-border bg-card/35 px-6 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle>Acesso profissional</CardTitle>
            <CardDescription>
              {isApiMode
                ? "Use o e-mail e a senha da sua conta profissional cadastrada."
                : "Demonstração: use psi@aelo.com, admin@aelo.com ou intern@aelo.com com senha aelo123."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
