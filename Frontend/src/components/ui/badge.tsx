import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variant === "default" && "border-primary/30 bg-primary/10 text-primary",
        variant === "success" && "border-accent/30 bg-accent/10 text-accent",
        variant === "warning" && "border-amber-400/30 bg-amber-400/10 text-amber-300",
        variant === "muted" && "border-border bg-secondary text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
