import { Navigate } from "react-router-dom";
import { AeloBrand } from "@/components/brand/AeloBrand";
import { usePageTitle } from "@/hooks/usePageTitle";
import { LoginForm } from "@/components/forms/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { isApiMode } from "@/services/runtime";
import { LoadingScreen } from "@/components/ui/loading-skeleton";

export function LoginPage() {
  usePageTitle("Entrar");
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background-full text-text-primary lg:grid-cols-[1.15fr_0.85fr]">
      <section className="flex flex-col justify-between gap-12 px-6 py-8 lg:px-16 lg:py-12">
        <AeloBrand size="regular" titleAs="h1" subtitle="Plataforma clínica para psicologia" />
        <div className="aelo-thread-list max-w-2xl">
          <div className="aelo-thread-item pb-4">
            <h2 className="aelo-page-title md:text-display-3-medium">Cada sessão continua a anterior.</h2>
            <p className="mt-5 max-w-xl text-body-2-regular text-text-secondary">
              Registre o atendimento de hoje com o histórico do paciente por perto. A IA sugere e aponta a fonte, e a decisão clínica continua sua.
            </p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center border-t border-separator-border bg-background-primary-default px-6 py-10 lg:border-s lg:border-t-0">
        <div className="w-full max-w-sm">
          <h2 className="text-title-3-semibold">Acesso profissional</h2>
          <p className="mt-2 mb-6 text-body-regular text-text-secondary">
            {isApiMode
              ? "Entre com o e-mail e a senha da sua conta profissional."
              : "Demonstração: use psi@aelo.com, admin@aelo.com ou intern@aelo.com com senha aelo123."}
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
