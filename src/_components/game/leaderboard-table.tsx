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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { cn } from "@/utils/cn";
import { formatAccuracy, formatWpm } from "@/utils/format";
import { readTableUrl, writeTableUrl } from "@/utils/url";
import { ProgressBar } from "@/_components/ui/progress-bar";
import { Pagination } from "@/_components/ui/pagination";
import type { PlayerState } from "@/types/race";

const PAGE_SIZES = [10, 25, 50] as const;
const DEFAULTS = { sort: "wpm", dir: "desc" as const, page: 0, size: 10 };
const helper = createColumnHelper<PlayerState>();

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-block w-1.5 h-1.5 rounded-full ml-1.5 mb-0.5",
        online ? "bg-green-400" : "bg-white/20",
      )}
    />
  );
}

type Props = {
  players: PlayerState[];
  sentenceLength: number;
  currentUserId: string;
};

export function LeaderboardTable({ players, sentenceLength, currentUserId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const { sort: sortId, dir: sortDir, page: pageIndex, size: pageSize } =
    readTableUrl(searchParams, DEFAULTS, PAGE_SIZES);

  const sorting: SortingState = useMemo(
    () => [{ id: sortId, desc: sortDir === "desc" }],
    [sortId, sortDir],
  );

  const updateUrl = useCallback(
    (newSort: SortingState, newPage: number, newSize: number) => {
      const next = writeTableUrl(searchParams, newSort, newPage, newSize);
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  const columns = useMemo(
    () => [
      helper.accessor("username", {
        header: "Player",
        cell: ({ row }) => (
          <span
            className={cn(
              "flex items-center",
              row.original.userId === currentUserId && "text-blue-400 font-semibold",
            )}
          >
            {row.original.finished && <span className="mr-1.5 text-xs">✓</span>}
            {row.original.username}
            <OnlineDot online={row.original.isOnline} />
          </span>
        ),
      }),
      helper.display({
        id: "progress",
        header: "Progress",
        enableSorting: false,
        cell: ({ row }) => (
          <ProgressBar
            value={sentenceLength > 0 ? row.original.correctChars / sentenceLength : 0}
          />
        ),
      }),
      helper.accessor("wpm", {
        header: "WPM",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">{formatWpm(getValue())}</span>
        ),
      }),
      helper.accessor("accuracy", {
        header: "Accuracy",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">{formatAccuracy(getValue())}</span>
        ),
      }),
    ],
    [sentenceLength, currentUserId],
  );

  const table = useReactTable({
    data: players,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      updateUrl(next, 0, pageSize);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      updateUrl(sorting, next.pageIndex, next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
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
              <td colSpan={4} className="px-4 py-10 text-center text-white/30 text-sm">
                No players yet — start typing to appear here.
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
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Pagination
        pageIndex={pageIndex}
        pageCount={table.getPageCount()}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        totalRows={players.length}
        onPrevious={() => table.previousPage()}
        onNext={() => table.nextPage()}
        onPageSizeChange={(s) => updateUrl(sorting, 0, s)}
        className="border-t border-white/10"
      />
    </div>
  );
}
