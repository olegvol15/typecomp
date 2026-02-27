"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";

type Props = {
  sentence: string;
  typed: string;
  disabled: boolean;
  onType: (value: string) => void;
};

export function TypingArea({ sentence, typed, disabled, onType }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when the round becomes active
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  return (
    <div className="space-y-4">
      {/* Sentence display with character-level feedback */}
      <div
        className="rounded-xl border border-white/10 bg-white/5 p-6 font-mono text-xl leading-loose select-none cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {sentence.split("").map((char, i) => {
          if (i > typed.length) {
            // Untyped, not cursor
            return (
              <span key={i} className="text-white/25">
                {char}
              </span>
            );
          }
          if (i === typed.length) {
            // Current cursor position
            return (
              <span
                key={i}
                className="text-white/25 border-b-2 border-blue-400"
              >
                {char}
              </span>
            );
          }
          const correct = typed[i] === char;
          return (
            <span
              key={i}
              className={
                correct ? "text-green-400" : "text-red-400 bg-red-900/20"
              }
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Actual input — transparent overlay approach */}
      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={(e) => onType(e.target.value.slice(0, sentence.length))}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={clsx(
          "w-full rounded-lg border px-4 py-3 font-mono text-sm outline-none transition-colors",
          "bg-white/5 text-white placeholder-white/30",
          disabled
            ? "border-white/5 opacity-40 cursor-not-allowed"
            : "border-white/20 focus:border-blue-400",
        )}
        placeholder={disabled ? "Waiting for next round…" : "Start typing…"}
      />
    </div>
  );
}
