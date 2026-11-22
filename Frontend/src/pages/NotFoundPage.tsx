import { usePageTitle } from "@/hooks/usePageTitle";
import { ButtonLink } from "@/components/ui/button-link";

export function NotFoundPage() {
  usePageTitle("Página não encontrada");
  return (
    <main className="grid min-h-screen place-items-center bg-background-full p-6 text-center">
      <div>
        <h1 className="aelo-page-title">Página não encontrada</h1>
        <p className="mt-3 max-w-md text-body-regular text-text-secondary">
          Este endereço não existe ou não está disponível para o seu perfil.
        </p>
        <ButtonLink
          to="/dashboard"
          variant="primary" className="mt-6"
        >
          Voltar para Hoje
        </ButtonLink>
      </div>
    </main>
  );
}
