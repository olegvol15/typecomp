import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { ensureProfile } from "@/lib/profiles/ensure-profile";
import { Header } from "@/_components/layout/header";
import { RacePage } from "@/_components/game/race-page";
import type { RankingRow } from "@/_components/game/rankings-table";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const profile = await ensureProfile(supabase, user);

  if (!profile) redirect("/onboarding");

  const { data } = await supabase
    .from("round_results")
    .select("user_id, username, wpm, accuracy")
    .eq("finished", true);

  const map = new Map<string, RankingRow>();
  for (const row of data ?? []) {
    const ex = map.get(row.user_id);
    if (ex) {
      ex.races += 1;
      if (row.wpm > ex.best_wpm) ex.best_wpm = row.wpm;
      ex.avg_wpm += row.wpm;
      ex.avg_accuracy += row.accuracy;
    } else {
      map.set(row.user_id, {
        userId: row.user_id,
        username: row.username,
        races: 1,
        best_wpm: row.wpm,
        avg_wpm: row.wpm,
        avg_accuracy: row.accuracy,
      });
    }
  }
  const rankings: RankingRow[] = Array.from(map.values()).map((r) => ({
    ...r,
    avg_wpm: r.avg_wpm / r.races,
    avg_accuracy: r.avg_accuracy / r.races,
  }));

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <Header username={profile.username} />
        <RacePage userId={user.id} username={profile.username} rankings={rankings} />
      </div>
    </main>
  );
}
