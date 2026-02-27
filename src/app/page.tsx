import { requireUser } from "@/lib/auth/require-user";
import { ensureProfile } from "@/lib/profiles/ensure-profile";
import { LogoutButton } from "./_components/logout-button";
import { RacePage } from "./_components/race-page";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const profile = await ensureProfile(supabase, user);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Typecomp</h1>
            <p className="text-sm text-white/40 mt-0.5">
              Racing as{" "}
              <span className="text-white/80">{profile.username}</span>
            </p>
          </div>
          <LogoutButton />
        </header>

        <RacePage userId={user.id} username={profile.username} />
      </div>
    </main>
  );
}
