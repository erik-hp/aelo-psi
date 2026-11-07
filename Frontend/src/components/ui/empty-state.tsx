import type { LucideIcon } from "lucide-react";
import { FileSearch } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon = FileSearch, title, description }: EmptyStateProps) {
  return (
    <div className="clinical-panel grid min-h-52 place-items-center p-8 text-center">
      <div>
        <Icon className="mx-auto h-6 w-6 text-foreground-icon-secondary" aria-hidden />
        <h3 className="mt-3 text-headline-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-body-regular text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
