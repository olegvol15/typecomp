import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const USERNAME_RE = /^[a-z0-9_]+$/;

function validateUsername(value: unknown): string | null {
  if (typeof value !== "string") return "Username is required.";
  if (value.length < 3) return "At least 3 characters required.";
  if (value.length > 20) return "Maximum 20 characters.";
  if (!USERNAME_RE.test(value)) return "Lowercase letters, numbers, and underscores only.";
  if (value.startsWith("_") || value.endsWith("_")) return "Cannot start or end with an underscore.";
  return null;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { username } = body;

  const validationError = validateUsername(username);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Check uniqueness
  const { data: existing } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
  }

  // Insert profile
  const { error: insertError } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, username });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create profile." }, { status: 500 });
  }

  return NextResponse.json({ username });
}
