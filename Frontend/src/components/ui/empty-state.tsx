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
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-background-secondary-default text-status-blue-text">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-headline-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-body-regular text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
