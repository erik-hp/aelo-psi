import { cn } from "@/lib/utils";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@/components/base/table/table";

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
    <div className="min-w-0 overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default">
        <Table aria-label={columns.map((column) => column.header).join(", ")} size="sm" className="min-w-[640px]" containerClassName="focus-ring">
          <TableHeader>
              {columns.map((column, index) => (
                <TableColumn id={column.key} key={column.key} isRowHeader={index === 0} className={cn("px-4 py-3 text-caption-1-medium", column.className)}>
                  {column.header}
                </TableColumn>
              ))}
          </TableHeader>
          <TableBody renderEmptyState={() => <span className="text-body-regular text-text-secondary">Nenhum registro disponível.</span>}>
            {data.map((item) => (
              <TableRow
                id={getRowKey(item)}
                key={getRowKey(item)}
                className={cn("transition-colors", onRowClick && "cursor-pointer")}
                onAction={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn("px-4 py-3 align-middle whitespace-normal", column.className)}>
                    {column.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}
