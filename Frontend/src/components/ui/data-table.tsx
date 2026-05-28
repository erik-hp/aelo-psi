import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({ columns, data, getRowKey, onRowClick }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-secondary/80 text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-4 py-3 font-medium", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr
                key={getRowKey(item)}
                className={cn("bg-card/40 transition", onRowClick && "cursor-pointer hover:bg-secondary/50")}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3 align-middle", column.className)}>
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
