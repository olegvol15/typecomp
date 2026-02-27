import type { User } from "@supabase/supabase-js";

function slugifyUsername(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function makeDefaultUsername(email: string) {
  const base = slugifyUsername(email.split("@")[0] || "player");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}_${suffix}`;
}

export async function ensureProfile(
  supabase: any,
  user: User
) {
  // 1) check existing
  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("user_id, username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing;

  // 2) create
  const email = user.email ?? "player@example.com";
  const username = makeDefaultUsername(email);

  const { data: inserted, error: insErr } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, username })
    .select("user_id, username")
    .single();

  if (insErr) throw insErr;
  return inserted;
}