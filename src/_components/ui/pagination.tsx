"use client";

import { cn } from "@/utils/cn";

type Props = {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  canPreviousPage: boolean;
  canNextPage: boolean;
  totalRows: number;
  onPrevious: () => void;
  onNext: () => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
};

export function Pagination({
  pageIndex,
  pageCount,
  pageSize,
  pageSizeOptions,
  canPreviousPage,
  canNextPage,
  totalRows,
  onPrevious,
  onNext,
  onPageSizeChange,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 text-xs text-white/40",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span>Rows</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          className="bg-white/5 border border-white/10 rounded px-1.5 py-1 text-white/70 hover:border-white/30 transition-colors outline-none cursor-pointer"
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-white/25">{totalRows} total</span>
      </div>

      <div className="flex items-center gap-3">
        {pageCount > 1 && (
          <span>
            Page {pageIndex + 1} of {pageCount}
          </span>
        )}
        <div className="flex gap-1.5">
          <NavButton onClick={onPrevious} disabled={!canPreviousPage}>
            ←
          </NavButton>
          <NavButton onClick={onNext} disabled={!canNextPage}>
            →
          </NavButton>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 rounded border border-white/10 disabled:opacity-30 hover:border-white/30 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}
