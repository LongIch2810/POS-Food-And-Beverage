import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyAction?: ReactNode;
}

// Hàng cao tối thiểu 48px, cột tiền canh phải và tabular, bảng rộng cuộn ngang trong khung riêng (DESIGN.md §6.7)
const alignClass = (align?: 'left' | 'center' | 'right') => align === 'right' ? 'is-right' : align === 'center' ? 'is-center' : undefined;

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Không có dữ liệu',
  emptyAction,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="table-empty">
        <Inbox size={32} aria-hidden="true" />
        <p>{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={alignClass(col.align)} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row)}
              className={onRowClick ? 'is-clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={alignClass(col.align)}>
                  {col.render(row, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
