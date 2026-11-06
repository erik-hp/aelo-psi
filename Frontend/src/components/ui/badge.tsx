import { Chip, type ChipColor } from "@/components/base/badges/chip";
import { cx } from "@/utils/cx";

const colors = { default: "cyan", success: "lime", warning: "yellow", muted: "soft", critical: "rose" } as const satisfies Record<string, ChipColor>;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "muted" | "critical" }) {
  return (
    <Chip
      {...props}
      className={cx("max-w-full whitespace-normal break-words text-start", className)}
      variant="caption"
      color={colors[variant]}
    />
  );
}
