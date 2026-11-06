import type { HTMLAttributes } from "react";
import { ScrollFade, useScrollFade } from "@/components/foundations/scroll-fade/scroll-fade";
import { cx } from "@/utils/cx";

export function ScrollArea({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const fade = useScrollFade();
  return <div className="relative min-h-0 min-w-0">
    <div {...props} tabIndex={0} onScroll={fade.onScroll} className={cx("focus-ring overflow-auto overscroll-contain rounded-xl", className)}>{children}</div>
    <ScrollFade progress={fade.progress} surfaceClassName="from-background-secondary-default" />
  </div>;
}
