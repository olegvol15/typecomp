"use client";

import { cn } from "@/utils/cn";

type Props = {
  /** Completion ratio, 0–1 */
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: Props) {
  const pct = Math.min(100, Math.max(0, value * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("w-full bg-white/10 rounded-full h-1.5 min-w-24", className)}
    >
      <div
        className="bg-blue-400 h-1.5 rounded-full transition-all duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
