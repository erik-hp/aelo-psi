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
    <main className="grid min-h-screen grid-cols-1 bg-background-full text-text-primary lg:grid-cols-[1.1fr_1fr]">
      <section className="aelo-hero flex flex-col justify-between gap-12 px-6 py-8 lg:px-16 lg:py-12" aria-label="Apresentação">
        <AeloBrand size="regular" titleAs="h1" subtitle="Plataforma clínica para psicologia" className="[&_p]:text-inherit" />
        <div className="max-w-xl">
          <h2 className="aelo-display text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)]">Um lugar calmo para o registro clínico.</h2>
          <p className="mt-6 max-w-md text-body-2-regular">
            Registre o atendimento de hoje com o histórico do paciente por perto. A IA sugere e aponta a fonte, e a decisão clínica continua sua.
          </p>
        </div>
        <svg viewBox="0 0 400 120" className="hidden w-full max-w-md opacity-60 lg:block" aria-hidden="true" focusable="false">
          <path d="M20 118V70a50 50 0 0 1 100 0v48z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M150 118V50a50 50 0 0 1 100 0v68z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M280 118V80a50 50 0 0 1 100 0v38z" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="200" cy="96" r="5" style={{ fill: "var(--aelo-hero-mark)" }} />
        </svg>
      </section>
      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h2 className="aelo-page-title">Acesso profissional</h2>
          <p className="mt-3 mb-6 text-body-regular text-text-secondary">
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
