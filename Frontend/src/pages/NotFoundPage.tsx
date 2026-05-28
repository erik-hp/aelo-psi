import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Página não encontrada</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          A rota solicitada não existe ou não está disponível para o perfil atual.
        </p>
        <Link
          to="/dashboard"
          className="focus-ring mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
