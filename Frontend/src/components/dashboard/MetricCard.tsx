import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone?: "blue" | "cyan" | "amber";
}

export function MetricCard({ label, value, delta, icon: Icon, tone = "blue" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 break-words">
          <p className="text-body-regular text-text-secondary">{label}</p>
          <p className="mt-2 text-title-2-semibold">{value}</p>
          {delta ? <p className="mt-2 text-caption-1-regular text-text-secondary">{delta}</p> : null}
        </div>
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            tone === "blue" && "bg-status-blue-background text-status-blue-text",
            tone === "cyan" && "bg-status-lime-background text-status-lime-text",
            tone === "amber" && "bg-status-yellow-background text-status-yellow-text",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
