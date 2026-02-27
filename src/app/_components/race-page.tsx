"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentRound } from "@/hooks/use-current-round";
import { useRace } from "@/hooks/use-race";
import { computeStats } from "@/utils/stats";
import { Timer } from "./timer";
import { TypingArea } from "./typing-area";
import { Leaderboard } from "./leaderboard";
import type { PlayerState } from "@/types/race";

type Props = {
  userId: string;
  username: string;
};

export function RacePage({ userId, username }: Props) {
  const { round, secondsLeft, isLoading, error } = useCurrentRound();
  const { players, broadcastUpdate, persistResult } = useRace(
    round,
    userId,
    username,
  );

  const [typed, setTyped] = useState("");

  // Refs to avoid stale closures in effects
  const typedRef = useRef(typed);
  useEffect(() => {
    typedRef.current = typed;
  }, [typed]);

  const persistedRef = useRef(false);
  const roundIdRef = useRef<string | null>(null);

  const sentence = round?.sentence.text ?? "";
  const roundActive = secondsLeft > 0;

  // Reset state when a new round starts
  useEffect(() => {
    if (!round || round.id === roundIdRef.current) return;
    roundIdRef.current = round.id;
    setTyped("");
    persistedRef.current = false;
  }, [round?.id]);

  // Persist result when the round clock hits zero
  useEffect(() => {
    if (!round || roundActive || persistedRef.current) return;
    if (typedRef.current.length === 0) return; // nothing typed, nothing to save
    persistedRef.current = true;

    const t = typedRef.current;
    const s = round.sentence.text;
    const stats = computeStats(t, s, 60);
    void persistResult(
      round.id,
      t.slice(0, s.length),
      stats.correctChars,
      stats.accuracy,
      stats.wpm,
      false, // finished by time, not necessarily complete
    );
  }, [roundActive, round, persistResult]);

  const handleType = useCallback(
    (value: string) => {
      if (!round || !roundActive) return;
      const capped = value.slice(0, sentence.length);
      setTyped(capped);

      const elapsed = Math.max(1, 60 - secondsLeft);
      const stats = computeStats(capped, sentence, elapsed);

      broadcastUpdate({
        roundId: round.id,
        userId,
        username,
        typedText: capped,
        correctChars: stats.correctChars,
        typedChars: capped.length,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        updatedAt: new Date().toISOString(),
      });

      // Immediately persist when the player completes the sentence
      if (
        capped.length === sentence.length &&
        stats.correctChars === sentence.length &&
        !persistedRef.current
      ) {
        persistedRef.current = true;
        void persistResult(
          round.id,
          capped,
          stats.correctChars,
          stats.accuracy,
          stats.wpm,
          true,
        );
      }
    },
    [
      round,
      roundActive,
      sentence,
      secondsLeft,
      userId,
      username,
      broadcastUpdate,
      persistResult,
    ],
  );

  // Live stats for the current user
  const elapsed = Math.max(1, 60 - secondsLeft);
  const liveStats =
    typed.length > 0 ? computeStats(typed, sentence, elapsed) : null;

  // Merge live self-stats into the leaderboard.
  // Because broadcast: { self: false }, the current user never receives their
  // own updates — so we inject the entry locally from typed state.
  const leaderboardPlayers = useMemo<PlayerState[]>(() => {
    const all = Array.from(players.values());
    const stats = liveStats ?? { correctChars: 0, accuracy: 0, wpm: 0 };
    const self: PlayerState = {
      userId,
      username,
      typedText: typed,
      correctChars: stats.correctChars,
      typedChars: typed.length,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      finished:
        typed.length === sentence.length &&
        stats.correctChars === sentence.length,
      isOnline: true,
      updatedAt: new Date().toISOString(),
    };
    const idx = all.findIndex((p) => p.userId === userId);
    if (idx >= 0) {
      all[idx] = self;
    } else {
      all.push(self);
    }
    return all;
  }, [players, typed, liveStats, userId, username, sentence.length]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/50 bg-red-900/10 p-6 text-red-400">
        Failed to load round. Please refresh.
      </div>
    );
  }

  if (isLoading || !round) {
    return (
      <div className="flex items-center justify-center min-h-64 text-white/30 text-sm">
        <span className="animate-pulse">Connecting to race…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row: round info + timer */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-white/60">
            Round{" "}
            <span className="text-white font-bold">#{round.roundNumber}</span>
          </h2>
          {round.sentence.source && (
            <p className="text-xs text-white/30 mt-0.5">
              — {round.sentence.source}
            </p>
          )}
        </div>
        <Timer secondsLeft={secondsLeft} />
      </div>

      {/* Typing area */}
      <TypingArea
        sentence={sentence}
        typed={typed}
        disabled={!roundActive}
        onType={handleType}
      />

      {/* Live personal stats */}
      {liveStats && (
        <div className="flex gap-6 text-sm text-white/40">
          <span>
            <span className="text-white font-mono tabular-nums">
              {liveStats.wpm.toFixed(1)}
            </span>{" "}
            WPM
          </span>
          <span>
            <span className="text-white font-mono tabular-nums">
              {(liveStats.accuracy * 100).toFixed(1)}%
            </span>{" "}
            accuracy
          </span>
          <span>
            <span className="text-white font-mono tabular-nums">
              {liveStats.correctChars}
            </span>
            /{sentence.length} chars
          </span>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Leaderboard
        </h3>
        {/* Suspense required because Leaderboard uses useSearchParams */}
        <Suspense
          fallback={
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/30 text-sm">
              Loading leaderboard…
            </div>
          }
        >
          <Leaderboard
            players={leaderboardPlayers}
            sentenceLength={sentence.length}
            currentUserId={userId}
          />
        </Suspense>
      </div>
    </div>
  );
}
