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
      className={cx("h-auto min-h-10 gap-2 whitespace-normal", size === "icon" && "size-10 shrink-0 p-0", className)}>
      <span className="inline-flex min-w-0 items-center justify-center gap-2 text-center">{children}</span>
    </BoardButton>
  ),
);
Button.displayName = "Button";
