"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentRound } from "@/hooks/use-current-round";
import { useRace } from "@/hooks/use-race";
import { computeStats } from "@/utils/stats";
import { formatAccuracy, formatWpm } from "@/utils/format";
import { RoundTimer } from "./round-timer";
import { TypingInput } from "./typing-input";
import { LeaderboardTable } from "./leaderboard-table";
import type { PlayerState } from "@/types/race";

type Props = {
  userId: string;
  username: string;
};

export function RacePage({ userId, username }: Props) {
  const { round, secondsLeft, isLoading, error } = useCurrentRound();
  const { players, broadcastUpdate, persistResult } = useRace(round, userId, username);

  const [typed, setTyped] = useState("");
  const typedRef = useRef(typed);
  useEffect(() => { typedRef.current = typed; }, [typed]);

  const persistedRef = useRef(false);
  const roundIdRef = useRef<string | null>(null);

  const sentence = round?.sentence.text ?? "";
  const roundActive = secondsLeft > 0;

  useEffect(() => {
    if (!round || round.id === roundIdRef.current) return;
    roundIdRef.current = round.id;
    setTyped("");
    persistedRef.current = false;
  }, [round?.id]);

  // Persist on round expiry (uses ref to avoid stale closure on `typed`)
  useEffect(() => {
    if (!round || roundActive || persistedRef.current) return;
    if (typedRef.current.length === 0) return;
    persistedRef.current = true;
    const t = typedRef.current;
    const stats = computeStats(t, round.sentence.text, 60);
    void persistResult(round.id, t.slice(0, round.sentence.text.length), stats.correctChars, stats.accuracy, stats.wpm, false);
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

      if (capped.length === sentence.length && stats.correctChars === sentence.length && !persistedRef.current) {
        persistedRef.current = true;
        void persistResult(round.id, capped, stats.correctChars, stats.accuracy, stats.wpm, true);
      }
    },
    [round, roundActive, sentence, secondsLeft, userId, username, broadcastUpdate, persistResult],
  );

  const elapsed = Math.max(1, 60 - secondsLeft);
  const liveStats = typed.length > 0 ? computeStats(typed, sentence, elapsed) : null;

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
      finished: typed.length === sentence.length && stats.correctChars === sentence.length,
      isOnline: true,
      updatedAt: new Date().toISOString(),
    };
    const idx = all.findIndex((p) => p.userId === userId);
    if (idx >= 0) all[idx] = self;
    else all.push(self);
    return all;
  }, [players, typed, liveStats, userId, username, sentence.length]);

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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-white/60">
            Round <span className="text-white font-bold">#{round.roundNumber}</span>
          </h2>
          {round.sentence.source && (
            <p className="text-xs text-white/30 mt-0.5">— {round.sentence.source}</p>
          )}
        </div>
        <RoundTimer secondsLeft={secondsLeft} />
      </div>

      <TypingInput sentence={sentence} typed={typed} disabled={!roundActive} onType={handleType} />

      {liveStats && (
        <div className="flex gap-6 text-sm text-white/40">
          <span>
            <span className="text-white font-mono tabular-nums">{formatWpm(liveStats.wpm)}</span> WPM
          </span>
          <span>
            <span className="text-white font-mono tabular-nums">{formatAccuracy(liveStats.accuracy)}</span> accuracy
          </span>
          <span>
            <span className="text-white font-mono tabular-nums">{liveStats.correctChars}</span>/{sentence.length} chars
          </span>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Leaderboard
        </h3>
        <Suspense
          fallback={
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/30 text-sm">
              Loading leaderboard…
            </div>
          }
        >
          <LeaderboardTable
            players={leaderboardPlayers}
            sentenceLength={sentence.length}
            currentUserId={userId}
          />
        </Suspense>
      </div>
    </div>
  );
}
