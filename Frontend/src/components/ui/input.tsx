import * as React from "react";
import { InputBase, type InputBaseProps } from "@/components/base/input/input";
import { cx } from "@/utils/cx";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & Pick<InputBaseProps, "leadingIcon">>(
  ({ className, leadingIcon, size: _size, ...props }, ref) => (
    <InputBase
      inputRef={ref}
      leadingIcon={leadingIcon}
      className="min-h-6"
      fieldClassName={cx("border border-border-button-default focus-within:ring-border-focus-ring", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";
