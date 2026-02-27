import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { ensureProfile } from "@/lib/profiles/ensure-profile";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const profile = await ensureProfile(supabase, user);

  if (profile) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-2xl font-semibold">Choose your username</h1>
        <p className="mt-1 text-sm text-white/50">This is how other players will see you.</p>
        <OnboardingForm />
      </div>
    </main>
  );
}
