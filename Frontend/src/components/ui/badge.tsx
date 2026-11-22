import { RiAlertLine, RiCheckLine, RiErrorWarningLine, type RemixiconComponentType } from "@remixicon/react";
import { Chip, type ChipColor } from "@/components/base/badges/chip";
import { cx } from "@/utils/cx";

type BadgeVariant = "default" | "success" | "warning" | "muted" | "critical";

const colors = { default: "cyan", success: "lime", warning: "yellow", muted: "soft", critical: "rose" } as const satisfies Record<BadgeVariant, ChipColor>;

/** Status must not rely on color alone; counters can turn the mark off. */
const icons: Partial<Record<BadgeVariant, RemixiconComponentType>> = { success: RiCheckLine, warning: RiAlertLine, critical: RiErrorWarningLine };

export function Badge({
  className,
  variant = "default",
  showIcon = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; showIcon?: boolean }) {
  const Icon = showIcon ? icons[variant] : undefined;
  return (
    <Chip
      {...props}
      className={cx("max-w-full gap-1 whitespace-normal break-words text-start", className)}
      variant="caption"
      color={colors[variant]}
    >
      {Icon ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
      {children}
    </Chip>
  );
}
