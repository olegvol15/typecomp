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

  // Stable Supabase browser client — created once per hook instance
  const supabase = useRef(createSupabaseBrowserClient()).current;

  // -------------------------------------------------------------------------
  // Load DB results for the current round whenever round.id changes.
  // These act as a baseline for users who typed before we joined.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!round) return;

    // Reset player map for the new round
    setPlayers(new Map());

    supabase
      .from("round_results")
      .select(
        "user_id, username, typed_text, correct_chars, accuracy, wpm, finished, updated_at",
      )
      .eq("round_id", round.id)
      .then(({ data }) => {
        if (!data) return;
        setPlayers((prev) => {
          const next = new Map(prev);
          for (const row of data) {
            next.set(row.user_id, {
              userId: row.user_id,
              username: row.username,
              typedText: row.typed_text,
              correctChars: row.correct_chars,
              typedChars: row.typed_text.length,
              wpm: Number(row.wpm),
              accuracy: Number(row.accuracy),
              finished: row.finished,
              isOnline: false, // updated by presence sync below
              updatedAt: row.updated_at,
            });
          }
          return next;
        });
      });
  }, [round?.id, supabase]);

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
        const onlineIds = new Set(Object.keys(state));
        setPlayers((prev) => {
          const next = new Map(prev);
          for (const [id, player] of next) {
            next.set(id, { ...player, isOnline: onlineIds.has(id) });
          }
          return next;
        });
      })
      .on("presence", { event: "join" }, ({ key }: { key: string }) => {
        setPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(key);
          if (existing) next.set(key, { ...existing, isOnline: true });
          return next;
        });
      })
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

          // Discard stale broadcasts from a previous round
          if (p.roundId !== round.id) return;

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
