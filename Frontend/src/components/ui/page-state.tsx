import { EmptyState } from "./empty-state";
import { LoadingSkeleton } from "./loading-skeleton";

export function PageLoading({ label = "Carregando dados…" }: { label?: string }) {
  return <div role="status" aria-busy="true" className="space-y-4">
    <span className="sr-only">{label}</span>
    <LoadingSkeleton className="h-16 w-full" />
    <div className="grid gap-4 sm:grid-cols-2"><LoadingSkeleton className="h-40" /><LoadingSkeleton className="h-40" /></div>
  </div>;
}

export function PageError({ description }: { description: string }) {
  return <div role="alert"><EmptyState title="Não foi possível carregar os dados" description={description} /></div>;
}
