import { Link, type LinkProps } from "react-router-dom";
import { buttonStyles } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

export function ButtonLink({ variant = "secondary", size = "medium", className, children, ...props }:
  LinkProps & { variant?: "primary" | "secondary" | "ghost"; size?: "medium" | "small" }) {
  return <Link {...props} className={cx(buttonStyles.base, buttonStyles.size[size], buttonStyles.variant[variant], "h-auto min-h-10 whitespace-normal text-center", className)}>
    <span className="inline-flex items-center justify-center gap-2 px-1">{children}</span>
  </Link>;
}
