import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { ensureProfile } from "@/lib/profiles/ensure-profile";
import { Header } from "@/_components/layout/header";
import { RacePage } from "@/_components/game/race-page";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const profile = await ensureProfile(supabase, user);

  if (!profile) redirect("/onboarding");

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <Header username={profile.username} />
        <RacePage userId={user.id} username={profile.username} />
      </div>
    </main>
  );
}
