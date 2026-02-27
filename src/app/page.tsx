import { requireUser } from "../lib/auth/require-user";
import { ensureProfile } from "@/lib/profiles/ensure-profile";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const profile = await ensureProfile(supabase, user);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Typecomp ✍️</h1>
        <p className="mt-2 text-white/70">
          Logged in as <span className="text-white">{profile.username}</span>
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          Next: rounds/ensure endpoint + realtime channel.
        </div>
      </div>
    </main>
  );
}