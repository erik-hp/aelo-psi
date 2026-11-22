import { RiFileSearchLine, type RemixiconComponentType } from "@remixicon/react";

interface EmptyStateProps {
  icon?: RemixiconComponentType;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon = RiFileSearchLine, title, description }: EmptyStateProps) {
  return (
    <div className="clinical-panel grid min-h-52 place-items-center p-8 text-center">
      <div>
        <Icon className="mx-auto size-7 text-foreground-icon-secondary" aria-hidden />
        <h3 className="aelo-display mt-3 text-xl">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-body-regular text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
