import { Chip, type ChipColor } from "@/components/base/badges/chip";

const colors = { default: "cyan", success: "lime", warning: "yellow", muted: "soft", critical: "rose" } as const satisfies Record<string, ChipColor>;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "muted" | "critical" }) {
  return (
    <Chip
      {...props}
      className={className}
      variant="caption"
      color={colors[variant]}
    />
  );
}
