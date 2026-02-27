"use client";

import { clsx } from "clsx";

type Props = { secondsLeft: number };

export function Timer({ secondsLeft }: Props) {
  const urgent = secondsLeft > 0 && secondsLeft <= 10;

  return (
    <div
      className={clsx(
        "text-4xl font-mono font-bold tabular-nums transition-colors",
        urgent ? "text-red-400 animate-pulse" : "text-white",
        secondsLeft === 0 && "text-white/30",
      )}
    >
      {String(secondsLeft).padStart(2, "0")}
      <span className="text-sm font-normal ml-1 opacity-60">s</span>
    </div>
  );
}
