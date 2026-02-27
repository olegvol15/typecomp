"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { formatAccuracy, formatWpm } from "@/utils/format";
import { Pagination } from "@/_components/ui/pagination";

export type RankingRow = {
  userId: string;
  username: string;
  races: number;
  best_wpm: number;
  avg_wpm: number;
  avg_accuracy: number;
};

const PAGE_SIZES = [10, 25, 50] as const;
const helper = createColumnHelper<RankingRow>();

type Props = {
  rows: RankingRow[];
  currentUserId: string;
};

export function RankingsTable({ rows, currentUserId }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "best_wpm", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const columns = useMemo(
    () => [
      helper.display({
        id: "rank",
        header: "#",
        enableSorting: false,
        cell: ({ row, table }) => {
          const { pageIndex: pi, pageSize: ps } = table.getState().pagination;
          return <span className="text-white/40">{pi * ps + row.index + 1}</span>;
        },
      }),
      helper.accessor("username", {
        header: "Player",
        cell: ({ row }) => (
          <span
            className={cn(
              row.original.userId === currentUserId && "text-blue-400 font-semibold",
            )}
          >
            {row.original.username}
          </span>
        ),
      }),
      helper.accessor("best_wpm", {
        header: "Best WPM",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">{formatWpm(getValue())}</span>
        ),
      }),
      helper.accessor("avg_wpm", {
        header: "Avg WPM",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">{formatWpm(getValue())}</span>
        ),
      }),
      helper.accessor("avg_accuracy", {
        header: "Avg Accuracy",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">{formatAccuracy(getValue())}</span>
        ),
      }),
      helper.accessor("races", {
        header: "Races",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">{getValue()}</span>
        ),
      }),
    ],
    [currentUserId],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      setPageIndex(0);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-white/10">
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "px-4 py-3 text-left text-white/40 font-medium text-xs uppercase tracking-wider",
                    header.column.getCanSort() &&
                      "cursor-pointer select-none hover:text-white/80 transition-colors",
                    header.id === "avg_wpm" && "hidden sm:table-cell",
                    header.id === "avg_accuracy" && "hidden sm:table-cell",
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() &&
                      (header.column.getIsSorted() === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-white/30 text-sm">
                No finished races yet — be the first!
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-white/5 transition-colors",
                  row.original.userId === currentUserId
                    ? "bg-blue-900/10"
                    : "hover:bg-white/[0.03]",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-4 py-3",
                      cell.column.id === "avg_wpm" && "hidden sm:table-cell",
                      cell.column.id === "avg_accuracy" && "hidden sm:table-cell",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      <Pagination
        pageIndex={pageIndex}
        pageCount={table.getPageCount()}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        totalRows={rows.length}
        onPrevious={() => table.previousPage()}
        onNext={() => table.nextPage()}
        onPageSizeChange={(s) => { setPageSize(s); setPageIndex(0); }}
        className="border-t border-white/10"
      />
    </div>
  );
}
