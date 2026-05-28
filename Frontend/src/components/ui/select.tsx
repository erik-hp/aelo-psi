import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "focus-ring h-10 rounded-md border border-input bg-background/70 px-3 text-sm text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";
