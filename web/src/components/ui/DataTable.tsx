import { cn } from "@/lib/utils";
import {
  ColumnDef,
  OnChangeFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  pageIndex?: number;
  pageCount?: number;
  onPageChange?: (pageIndex: number) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  manualPagination?: boolean;
  manualSorting?: boolean;
};

const PAGE_SIZE = 20;

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  emptyState,
  pageIndex: externalPageIndex,
  pageCount: externalPageCount,
  onPageChange,
  sorting: externalSorting,
  onSortingChange,
  manualPagination = false,
  manualSorting = false,
}: DataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalPageIndex, setInternalPageIndex] = useState(0);

  const currentSorting = manualSorting ? (externalSorting ?? []) : internalSorting;
  const currentPageIndex = manualPagination ? (externalPageIndex ?? 0) : internalPageIndex;

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(currentSorting) : updater;
    if (manualSorting) {
      onSortingChange?.(next);
    } else {
      setInternalSorting(next);
    }
  };

  const handlePaginationChange: OnChangeFn<{ pageIndex: number; pageSize: number }> = (
    updater,
  ) => {
    const next =
      typeof updater === "function"
        ? updater({ pageIndex: currentPageIndex, pageSize: PAGE_SIZE })
        : updater;
    if (manualPagination) {
      onPageChange?.(next.pageIndex);
    } else {
      setInternalPageIndex(next.pageIndex);
    }
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: currentSorting,
      pagination: { pageIndex: currentPageIndex, pageSize: PAGE_SIZE },
    },
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination,
    manualSorting,
    pageCount: manualPagination ? externalPageCount : undefined,
  });

  const { rows } = table.getRowModel();
  const totalPages = table.getPageCount();
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl border border-glass-divider">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-glass-divider bg-white/20">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted whitespace-nowrap",
                        canSort && "cursor-pointer select-none hover:text-text-secondary transition-colors",
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="shrink-0 text-text-subtle">
                            {sorted === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-glass-divider">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex min-h-[200px] items-center justify-center text-text-muted">
                    {emptyState ?? <span>暂无数据</span>}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="bg-white/0 hover:bg-white/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-text-body">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(totalPages > 1 || manualPagination) && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-text-muted">
            第 {currentPageIndex + 1} 页{totalPages > 0 ? `，共 ${totalPages} 页` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!canPrev}
              leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
            >
              上一页
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!canNext}
              rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
