import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Round } from "@/types/race";

export const runtime = "nodejs";

/**
 * POST /api/rounds/ensure
 *
 * Idempotent: returns the current active round, or creates the next one.
 *
 * Race-condition safety:
 *   - `rounds.round_number` has a UNIQUE constraint in the DB.
 *   - If two requests race on creating the same round_number we catch the
 *     23505 (unique violation) and fall back to a plain SELECT of the winner.
 *
 * Required Supabase RLS policies (add once in the dashboard):
 *   CREATE POLICY "authenticated_insert_rounds" ON rounds
 *     FOR INSERT TO authenticated WITH CHECK (true);
 *   CREATE POLICY "anyone_select_sentences" ON sentences
 *     FOR SELECT USING (true);
 */
export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the latest round (may be active or expired)
    const { data: latest, error: fetchErr } = await supabase
      .from("rounds")
      .select("id, round_number, start_at, end_at, sentences(id, text, source)")
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    const now = new Date();

    // Active round → return immediately
    if (latest && new Date(latest.end_at) > now) {
      return NextResponse.json({ round: shape(latest) });
    }

    // Need a new round — rotate sentences
    const { data: sentences, error: sentErr } = await supabase
      .from("sentences")
      .select("id")
      .order("created_at", { ascending: true });

    if (sentErr) throw sentErr;
    if (!sentences || sentences.length === 0) {
      return NextResponse.json(
        { error: "No sentences configured in the database" },
        { status: 500 },
      );
    }

    const nextNumber = (latest?.round_number ?? 0) + 1;
    const sentenceId = sentences[(nextNumber - 1) % sentences.length].id;
    const startAt = now.toISOString();
    const endAt = new Date(now.getTime() + 60_000).toISOString();

    const { data: created, error: insertErr } = await supabase
      .from("rounds")
      .insert({
        sentence_id: sentenceId,
        round_number: nextNumber,
        start_at: startAt,
        end_at: endAt,
      })
      .select("id, round_number, start_at, end_at, sentences(id, text, source)")
      .single();

    if (insertErr) {
      // Another request won the race — fetch the winning row
      if (insertErr.code === "23505") {
        const { data: winner, error: winErr } = await supabase
          .from("rounds")
          .select("id, round_number, start_at, end_at, sentences(id, text, source)")
          .order("round_number", { ascending: false })
          .limit(1)
          .single();

        if (winErr) throw winErr;
        return NextResponse.json({ round: shape(winner) });
      }
      throw insertErr;
    }

    return NextResponse.json({ round: shape(created) });
  } catch (err) {
    console.error("[rounds/ensure]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Supabase returns FK joins as object for many-to-one, but guard both shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shape(raw: any): Round {
  const sentence = Array.isArray(raw.sentences)
    ? raw.sentences[0]
    : raw.sentences;

  return {
    id: raw.id,
    roundNumber: raw.round_number,
    startAt: raw.start_at,
    endAt: raw.end_at,
    sentence,
  };
}
