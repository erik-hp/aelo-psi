import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
}

/** A single panel of facts: related figures read better together than in identical cards. */
export function MetricStrip({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("clinical-panel flex flex-wrap gap-x-8 gap-y-4 p-4 md:p-5", className)}>{children}</dl>;
}

export function MetricCard({ label, value, delta }: MetricCardProps) {
  return (
    <div className="min-w-40 flex-1 break-words">
      <dt className="text-body-regular text-text-secondary">{label}</dt>
      <dd className="mt-1 text-headline-semibold tabular-nums">{value}</dd>
      {delta ? <dd className="mt-0.5 text-caption-1-regular text-text-secondary">{delta}</dd> : null}
    </div>
  );
}
