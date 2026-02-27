import type { User } from "@supabase/supabase-js";

export async function ensureProfile(supabase: any, user: User) {
  const { data: existing, error } = await supabase
    .from("profiles")
    .select("user_id, username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return existing ?? null;
}
