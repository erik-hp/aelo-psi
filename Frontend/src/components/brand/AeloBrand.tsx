import { cn } from "@/lib/utils";

interface AeloBrandProps {
  subtitle?: string;
  size?: "compact" | "regular";
  className?: string;
}

/** Símbolo decorativo; o nome da marca permanece acessível em texto. */
export function AeloBrand({ subtitle, size = "compact", className }: AeloBrandProps) {
  const regular = size === "regular";
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10",
          regular ? "h-12 w-12" : "h-10 w-10",
        )}
        aria-hidden="true"
      >
        <img
          src="/brand/aelo-symbol.svg"
          alt=""
          className={regular ? "h-10 w-10" : "h-9 w-9"}
          width={regular ? 40 : 36}
          height={regular ? 40 : 36}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn("font-bold leading-tight tracking-[0.09em] text-foreground", regular ? "text-3xl" : "text-lg")}>AELO</span>
        {subtitle ? <span className={cn("text-muted-foreground", regular ? "text-sm" : "text-[11px]")}>{subtitle}</span> : null}
      </span>
    </div>
  );
}
