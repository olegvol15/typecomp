"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { throttle } from "@/utils/throttle";
import type { BroadcastPayload, PlayerState, Round } from "@/types/race";

// ---------------------------------------------------------------------------
// Validation schema — guards every incoming broadcast payload
// ---------------------------------------------------------------------------
const BroadcastSchema = z.object({
  roundId: z.string().uuid(),
  userId: z.string().uuid(),
  username: z.string().max(24),
  typedText: z.string().max(2000),
  correctChars: z.number().int().min(0),
  typedChars: z.number().int().min(0),
  wpm: z.number().min(0),
  accuracy: z.number().min(0).max(1),
  updatedAt: z.string(),
});

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useRace(
  round: Round | undefined,
  userId: string,
  username: string,
) {
  const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Tracks the current round ID without being captured in channel closures.
  // Used to reject stale broadcasts from the previous channel after round transition.
  const currentRoundIdRef = useRef<string | undefined>(undefined);

  // Stable Supabase browser client — created once per hook instance
  const supabase = useRef(createSupabaseBrowserClient()).current;

  // -------------------------------------------------------------------------
  // Load DB results for the current round whenever round.id changes.
  // These act as a baseline for users who typed before we joined.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!round) return;

    currentRoundIdRef.current = round.id;
    setPlayers(new Map());

    const cols = "user_id, username, typed_text, correct_chars, accuracy, wpm, finished, updated_at";

    const toPlayerState = (
      row: { user_id: string; username: string; typed_text: string; correct_chars: number; accuracy: number; wpm: number; finished: boolean; updated_at: string },
      fromCurrentRound: boolean,
    ): PlayerState => ({
      userId: row.user_id,
      username: row.username,
      // Don't carry over typed text from a previous round
      typedText: fromCurrentRound ? row.typed_text : "",
      correctChars: row.correct_chars,
      typedChars: fromCurrentRound ? row.typed_text.length : 0,
      wpm: Number(row.wpm),
      accuracy: Number(row.accuracy),
      finished: fromCurrentRound ? row.finished : false,
      isOnline: false,
      updatedAt: row.updated_at,
    });

    const load = async () => {
      // Load current round results first (may be empty for a brand-new round)
      const { data: current } = await supabase
        .from("round_results")
        .select(cols)
        .eq("round_id", round.id);

      // Load previous round results so returning players see their last stats
      // instead of zeros at the start of a new round
      let previous: typeof current = [];
      if (round.roundNumber > 1) {
        const { data: prevRound } = await supabase
          .from("rounds")
          .select("id")
          .eq("round_number", round.roundNumber - 1)
          .maybeSingle();
        if (prevRound) {
          const { data } = await supabase
            .from("round_results")
            .select(cols)
            .eq("round_id", prevRound.id);
          previous = data ?? [];
        }
      }

      setPlayers((prev) => {
        const next = new Map(prev);
        // Previous round fills baseline; current round overwrites where it exists
        for (const row of (previous ?? [])) {
          next.set(row.user_id, toPlayerState(row, false));
        }
        for (const row of (current ?? [])) {
          next.set(row.user_id, toPlayerState(row, true));
        }
        return next;
      });
    };

    void load();
  }, [round?.id, round?.roundNumber, supabase]);

  // -------------------------------------------------------------------------
  // Supabase Realtime subscription — single channel "race:global"
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!round || !userId) return;

    const channel = supabase.channel("race:global", {
      config: {
        presence: { key: userId },
        broadcast: { self: false },
      },
    });

    channel
      // --- Presence ---
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          userId: string;
          username: string;
        }>();
        setPlayers((prev) => {
          const next = new Map(prev);
          const onlineIds = new Set(Object.keys(state));

          // Add any online user not yet in the map (joined before us or never typed)
          for (const [key, presences] of Object.entries(state)) {
            if (!next.has(key)) {
              const p = (presences as { userId: string; username: string }[])[0];
              if (p) next.set(key, blankPlayer(p.userId, p.username));
            }
          }

          // Sync online flag for everyone
          for (const [id, player] of next) {
            next.set(id, { ...player, isOnline: onlineIds.has(id) });
          }
          return next;
        });
      })
      .on(
        "presence",
        { event: "join" },
        ({ key, newPresences }: { key: string; newPresences: { userId: string; username: string }[] }) => {
          setPlayers((prev) => {
            const next = new Map(prev);
            const existing = next.get(key);
            if (existing) {
              next.set(key, { ...existing, isOnline: true });
            } else {
              const p = newPresences[0];
              if (p) next.set(key, blankPlayer(p.userId, p.username));
            }
            return next;
          });
        },
      )
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        setPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(key);
          if (existing) next.set(key, { ...existing, isOnline: false });
          return next;
        });
      })
      // --- Typing broadcast ---
      .on(
        "broadcast",
        { event: "typing_update" },
        ({ payload }: { payload: unknown }) => {
          const parsed = BroadcastSchema.safeParse(payload);
          if (!parsed.success) return;
          const p = parsed.data;

          // Discard stale broadcasts from a previous round.
          // Uses a ref (not closure) so old channels after round transition
          // are rejected even before the channel unsubscribes fully.
          if (p.roundId !== currentRoundIdRef.current) return;

          const sentenceLen = round.sentence.text.length;
          const capped = p.typedText.slice(0, sentenceLen);
          const finished =
            capped.length === sentenceLen &&
            p.correctChars === sentenceLen;

          setPlayers((prev) => {
            const next = new Map(prev);
            next.set(p.userId, {
              userId: p.userId,
              username: p.username,
              typedText: capped,
              correctChars: p.correctChars,
              typedChars: p.typedChars,
              wpm: p.wpm,
              accuracy: p.accuracy,
              finished,
              isOnline: true,
              updatedAt: p.updatedAt,
            });
            return next;
          });
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId, username });
        }
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [round?.id, userId, username, supabase]);

  // -------------------------------------------------------------------------
  // Throttled broadcast — stable reference via useRef
  // -------------------------------------------------------------------------
  const broadcastUpdate = useRef(
    throttle((payload: BroadcastPayload) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing_update",
        payload,
      });
    }, 120),
  ).current;

  // -------------------------------------------------------------------------
  // Persist final result to round_results (upsert, RLS-safe)
  // -------------------------------------------------------------------------
  const persistResult = useCallback(
    async (
      roundId: string,
      typedText: string,
      correctChars: number,
      accuracy: number,
      wpm: number,
      finished: boolean,
    ) => {
      const { error } = await supabase.from("round_results").upsert(
        {
          round_id: roundId,
          user_id: userId,
          username,
          typed_text: typedText,
          correct_chars: correctChars,
          accuracy,
          wpm,
          finished,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "round_id,user_id" },
      );
      if (error) console.error("[persistResult]", error);
    },
    [userId, username, supabase],
  );

  return { players, broadcastUpdate, persistResult };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function blankPlayer(userId: string, username: string): PlayerState {
  return {
    userId,
    username,
    typedText: "",
    correctChars: 0,
    typedChars: 0,
    wpm: 0,
    accuracy: 0,
    finished: false,
    isOnline: true,
    updatedAt: new Date().toISOString(),
  };
}
