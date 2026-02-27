"use client";

import { cn } from "@/utils/cn";
import { formatSeconds } from "@/utils/format";

type Props = { secondsLeft: number };

export function RoundTimer({ secondsLeft }: Props) {
  return (
    <div
      className={cn(
        "text-4xl font-mono font-bold tabular-nums transition-colors",
        secondsLeft > 0 && secondsLeft <= 10 && "text-red-400 animate-pulse",
        secondsLeft === 0 && "text-white/30",
        secondsLeft > 10 && "text-white",
      )}
    >
      {formatSeconds(secondsLeft)}
      <span className="text-sm font-normal ml-1 opacity-60">s</span>
    </div>
  );
}
