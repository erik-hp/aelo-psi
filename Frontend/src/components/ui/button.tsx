import * as React from "react";
import { Button as BoardButton } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

const variants = { default: "primary", secondary: "secondary", ghost: "ghost", outline: "secondary", destructive: "danger" } as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: "default" | "sm" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => (
    <BoardButton {...props} buttonRef={ref} variant={variants[variant]} size={size === "sm" ? "small" : "medium"}
      className={cx("gap-2", size === "icon" && "size-9 p-0", className)}>
      <span className="inline-flex items-center justify-center gap-2">{children}</span>
    </BoardButton>
  ),
);
Button.displayName = "Button";
