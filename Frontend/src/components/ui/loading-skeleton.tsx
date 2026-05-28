import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-secondary/80", className)} />;
}

export function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="w-[min(92vw,520px)] space-y-4">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-28 w-full" />
        <LoadingSkeleton className="h-16 w-4/5" />
      </div>
    </div>
  );
}
