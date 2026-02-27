"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { Round } from "@/types/race";

async function fetchCurrentRound(): Promise<Round> {
  const res = await fetch("/api/rounds/ensure", { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const { round } = (await res.json()) as { round: Round };
  return round;
}

export function useCurrentRound() {
  const queryClient = useQueryClient();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useQuery<Round>({
    queryKey: ["current-round"],
    queryFn: fetchCurrentRound,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const round = query.data;

  // Countdown ticker — re-runs whenever endAt changes (i.e. new round arrived)
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!round?.endAt) return;

    const endAt = new Date(round.endAt).getTime();
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));

    tick();
    tickRef.current = setInterval(tick, 1_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [round?.endAt]);

  // Schedule query invalidation at endAt + 500 ms so a new round is fetched
  useEffect(() => {
    if (scheduleRef.current) clearTimeout(scheduleRef.current);
    if (!round?.endAt) return;

    const msUntilEnd = new Date(round.endAt).getTime() - Date.now();

    if (msUntilEnd <= 0) {
      // Already expired when we mounted — start polling until new round arrives
      const poll = setInterval(() => {
        void queryClient.invalidateQueries({ queryKey: ["current-round"] });
      }, 2_000);
      return () => clearInterval(poll);
    }

    scheduleRef.current = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ["current-round"] });
    }, msUntilEnd + 500);

    return () => {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
    };
  }, [round?.endAt, queryClient]);

  return {
    round,
    secondsLeft,
    isLoading: query.isLoading,
    error: query.error,
  };
}
