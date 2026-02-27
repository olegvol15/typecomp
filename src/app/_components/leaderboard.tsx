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
import { clsx } from "clsx";
import type { PlayerState } from "@/types/race";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5 min-w-24">
      <div
        className="bg-blue-400 h-1.5 rounded-full transition-all duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={clsx(
        "inline-block w-1.5 h-1.5 rounded-full ml-1.5 mb-0.5",
        online ? "bg-green-400" : "bg-white/20",
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 10;
const helper = createColumnHelper<PlayerState>();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type Props = {
  players: PlayerState[];
  sentenceLength: number;
  currentUserId: string;
};

export function Leaderboard({ players, sentenceLength, currentUserId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // URL-synced sort state
  const sortId = searchParams.get("sort") ?? "wpm";
  const sortDir = searchParams.get("dir") ?? "desc";
  const pageIndex = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const sorting: SortingState = useMemo(
    () => [{ id: sortId, desc: sortDir === "desc" }],
    [sortId, sortDir],
  );

  const updateUrl = useCallback(
    (newSort: SortingState, newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSort.length > 0) {
        params.set("sort", newSort[0].id);
        params.set("dir", newSort[0].desc ? "desc" : "asc");
      }
      params.set("page", String(newPage));
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
            className={clsx(
              "flex items-center",
              row.original.userId === currentUserId &&
                "text-blue-400 font-semibold",
            )}
          >
            {row.original.finished && (
              <span className="mr-1.5 text-xs">✓</span>
            )}
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
            value={row.original.correctChars}
            max={sentenceLength}
          />
        ),
      }),
      helper.accessor("wpm", {
        header: "WPM",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">
            {getValue().toFixed(1)}
          </span>
        ),
      }),
      helper.accessor("accuracy", {
        header: "Accuracy",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">
            {(getValue() * 100).toFixed(1)}%
          </span>
        ),
      }),
    ],
    [sentenceLength, currentUserId],
  );

  const table = useReactTable({
    data: players,
    columns,
    state: {
      sorting,
      pagination: { pageIndex, pageSize: PAGE_SIZE },
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;
      updateUrl(next, 0);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize: PAGE_SIZE })
          : updater;
      updateUrl(sorting, next.pageIndex);
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
                  className={clsx(
                    "px-4 py-3 text-left text-white/40 font-medium text-xs uppercase tracking-wider",
                    header.column.getCanSort() &&
                      "cursor-pointer select-none hover:text-white/80 transition-colors",
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
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
              <td
                colSpan={4}
                className="px-4 py-10 text-center text-white/30 text-sm"
              >
                No players yet — start typing to appear here.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={clsx(
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

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-white/40">
          <span>
            Page {pageIndex + 1} of {table.getPageCount()} &middot;{" "}
            {players.length} players
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-2.5 py-1 rounded border border-white/10 disabled:opacity-30 hover:border-white/30 hover:text-white transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-2.5 py-1 rounded border border-white/10 disabled:opacity-30 hover:border-white/30 hover:text-white transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
