import { usePageTitle } from "@/hooks/usePageTitle";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  usePageTitle(title);
  return (
    <div className="mb-6 flex min-w-0 flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div className="min-w-0">
        <h1 className="aelo-page-title text-text-primary">{title}</h1>
        <p className="mt-2 max-w-3xl text-body-regular text-text-secondary">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
