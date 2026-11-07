import { usePageTitle } from "@/hooks/usePageTitle";
import { ButtonLink } from "@/components/ui/button-link";

export function NotFoundPage() {
  usePageTitle("Página não encontrada");
  return (
    <main className="grid min-h-screen place-items-center bg-background-full p-6 text-center">
      <div>
        <p className="text-body-medium text-status-blue-text">404</p>
        <h1 className="mt-3 text-title-1-semibold">Página não encontrada</h1>
        <p className="mt-3 max-w-md text-body-regular text-text-secondary">
          A rota solicitada não existe ou não está disponível para o perfil atual.
        </p>
        <ButtonLink
          to="/dashboard"
          variant="primary" className="mt-6"
        >
          Voltar ao dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
