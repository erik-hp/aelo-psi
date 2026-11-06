interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="text-title-2-semibold text-text-primary">{title}</h1>
        <p className="mt-2 max-w-3xl text-body-regular text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
