import * as React from "react";
import { cn } from "@/lib/utils";
import { Group } from "react-aria-components";
import { inputFieldClassName } from "@/components/base/input/input";
import { RiArrowDownSLine } from "@remixicon/react";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <Group className={(state) => cn(inputFieldClassName(state), "min-w-0 border border-border-button-default focus-within:ring-border-focus-ring", className)}>
    <select
      ref={ref}
      className={cn(
        "min-h-6 w-full min-w-0 appearance-none border-0 bg-transparent px-1 pe-7 text-body-regular text-text-primary outline-none disabled:cursor-not-allowed disabled:text-text-tertiary",
      )}
      {...props}
    />
    <RiArrowDownSLine aria-hidden className="pointer-events-none absolute end-3 size-4 text-foreground-icon-secondary" />
    </Group>
  ),
);
Select.displayName = "Select";
