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
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          {delta ? <p className="mt-2 text-xs text-muted-foreground">{delta}</p> : null}
        </div>
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-md",
            tone === "blue" && "bg-primary/10 text-primary",
            tone === "cyan" && "bg-accent/10 text-accent",
            tone === "amber" && "bg-amber-400/10 text-amber-300",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
