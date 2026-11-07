import * as React from "react";
import { TextareaBase } from "@/components/base/textarea/textarea";
import { cx } from "@/utils/cx";

interface AeloTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Clinical narrative: the field's own utilities would override `.aelo-record`. */
  record?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, AeloTextareaProps>(
  ({ className, record = false, ...props }, ref) => (
    <TextareaBase
      inputRef={ref}
      className={cx("min-h-32", record && "font-serif! text-[1.0625rem]! leading-[1.7]!", className)}
      fieldClassName="border border-border-button-default focus-within:ring-border-focus-ring"
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
