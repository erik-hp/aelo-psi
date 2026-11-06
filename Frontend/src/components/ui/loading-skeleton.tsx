import { Skeleton } from "@/components/base/skeleton/skeleton";

export function LoadingSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

export function PageLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Carregando página…</span>
      <LoadingSkeleton className="h-8 w-48" />
      <LoadingSkeleton className="h-28 w-full" />
      <LoadingSkeleton className="h-16 w-4/5" />
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div role="status" aria-busy="true" className="grid min-h-screen place-items-center bg-background-full">
      <span className="sr-only">Carregando ambiente…</span>
      <div className="w-[min(92vw,520px)] space-y-4">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-28 w-full" />
        <LoadingSkeleton className="h-16 w-4/5" />
      </div>
    </div>
  );
}
