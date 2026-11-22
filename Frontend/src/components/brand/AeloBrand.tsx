import { cn } from "@/lib/utils";

interface AeloBrandProps {
  subtitle?: string;
  size?: "compact" | "regular";
  titleAs?: "p" | "h1";
  className?: string;
}

/** Símbolo decorativo; o nome da marca permanece acessível em texto. */
export function AeloBrand({ subtitle, size = "compact", titleAs: Title = "p", className }: AeloBrandProps) {
  const regular = size === "regular";
  const iconSize = regular ? 44 : 40;
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <img src="/brand/aelo-app-icon.svg" alt="" width={iconSize} height={iconSize} className="shrink-0 rounded-xl" />
      <div className="min-w-0">
        <Title className={cn("aelo-display", regular ? "text-title-1-semibold" : "text-title-3-semibold")} translate="no">AELO</Title>
        {subtitle ? <p className={cn("text-text-secondary", regular ? "text-body-regular" : "text-caption-1-regular")}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
