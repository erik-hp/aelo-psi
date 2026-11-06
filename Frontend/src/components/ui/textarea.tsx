import * as React from "react";
import { TextareaBase } from "@/components/base/textarea/textarea";
import { cx } from "@/utils/cx";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <TextareaBase
      inputRef={ref}
      className={cx("min-h-32", className)}
      fieldClassName="border border-border-button-default focus-within:ring-border-focus-ring"
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
